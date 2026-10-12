#!/usr/bin/env python3
"""Condense a real Claude Code stream-json session into replay data for the
build-story template. Nothing is invented: every line is taken from a real tool
call or result in the transcript, shortened.

  python3 -I scripts/extract-session.py storyboards/learnly.json out/learnly-build/assets/session

Storyboard (JSON):
  {
    "transcript": "<path to stream-json .jsonl>",
    "prompt": "<path to the prompt text file>", "promptLines": 9,
    "title": "...", "app": "Learnly",
    "steps": [
      {"prompt": true},
      {"use": 2},                         # one tool call (ordinal among all tool_use blocks) + its result
      {"uses": [3, 14], "label": "..."},  # a run of calls, collapsed into one line
      {"say": 15},                        # the agent's own words just before tool call 15
      {"use": 20, "shot": true}           # a screenshot call: its image is saved and shown
    ]
  }
Writes replay.json (steps with lines) and shots/NN.png next to it.
"""
import base64, json, os, re, sys

sb_path, out_dir = sys.argv[1], sys.argv[2]
sb = json.load(open(sb_path))
base = os.path.dirname(os.path.abspath(sb_path))
rel = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
os.makedirs(os.path.join(out_dir, 'shots'), exist_ok=True)

uses, results, texts_before = [], {}, {}
pending_text = []
first_ts = last_ts = None
for line in open(rel(sb['transcript'])):
    try:
        d = json.loads(line)
    except Exception:
        continue
    t = d.get('type')
    if t == 'assistant':
        for c in d['message'].get('content', []):
            if c.get('type') == 'text' and c['text'].strip():
                pending_text.append(c['text'].strip())
            elif c.get('type') == 'tool_use':
                if pending_text:
                    texts_before[len(uses)] = pending_text[-1]
                    pending_text = []
                uses.append(c)
    elif t == 'user':
        cont = d['message'].get('content')
        if isinstance(cont, list):
            for c in cont:
                if c.get('type') == 'tool_result':
                    results[c['tool_use_id']] = c.get('content')

def short(name):
    return name.replace('mcp__appbricx__', '')

def result_parts(use):
    cc = results.get(use['id'])
    text, images = '', []
    if isinstance(cc, str):
        text = cc
    elif isinstance(cc, list):
        for x in cc:
            if x.get('type') == 'text' and not x['text'].startswith('[Image'):
                text += x['text']
            elif x.get('type') == 'image' and x.get('source', {}).get('type') == 'base64':
                images.append(x['source']['data'])
    try:
        js = json.loads(text)
    except Exception:
        js = None
    return text, js, images

def trunc(s, n=96):
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[: n - 1] + '…'

shot_n = 0
def condense(k, want_shot):
    global shot_n
    use = uses[k]
    name, inp = short(use['name']), use['input']
    text, js, images = result_parts(use)
    call, out = '', []  # out: list of [kind, text]  kind in ok|err|info|dim
    shot = None
    if name == 'get_contract':
        call = 'get_contract()'
        out.append(['info', trunc(json.dumps(js, separators=(', ', ': ')) if js else text)])
    elif name in ('check_contract', 'apply_contract'):
        ct = inp.get('contract', {})
        app = ct.get('app', {})
        call = f'{name}({{ contract }})'
        if name == 'apply_contract':
            out.append(['dim', f"app: {app.get('name')} · “{app.get('tagline', '')}” · {app.get('brand_color', '')}"])
            out.append(['dim', 'personas: ' + ', '.join(p['id'] for p in ct.get('personas', []))])
            out.append(['dim', 'entities: ' + ', '.join(e['name'] for e in ct.get('entities', []))])
            rules = sum(len(e.get('rules', [])) for e in ct.get('entities', []))
            if rules:
                out.append(['dim', f'rules: {rules} before-write rule(s)'])
            out.append(['dim', 'workflows: ' + ' · '.join(w.get('title', w.get('id')) for w in ct.get('workflows', []))])
        rep = (js or {}).get('report', {})
        if rep.get('ok'):
            summ = rep.get('summary', {})
            ents = summ.get('entities', [])
            rows = sum(e.get('rows', 0) for e in ents)
            extra = f" · {len(ents)} tables · {len(summ.get('roles', []))} roles" if ents else ''
            if rows:
                extra += f' · {rows} seed rows'
            out.append(['ok', f"ok · {len(rep.get('errors', []))} errors{extra}"])
        else:
            out.append(['err', trunc(text, 110)])
    elif name == 'patch_contract':
        ops = []
        for e in inp.get('edits', []):
            pg = e.get('page')
            tgt = e.get('component', {}).get('name') or e.get('name') or (pg.get('name') if isinstance(pg, dict) else pg) or ''
            ops.append(f"{e.get('op')} {tgt}".strip())
        call = 'patch_contract(' + ', '.join(ops[:3]) + (', …' if len(ops) > 3 else '') + ')'
        rep = (js or {}).get('report', {})
        if js and js.get('error'):
            errs = rep.get('errors') or [js['error']]
            out.append(['err', f"{js.get('code', 'error')}: " + trunc(errs[0], 100)])
        else:
            gate = [f for f in rep.get('fixes', []) if 'passed every gate' in f]
            out.append(['ok', 'ok · ' + (trunc(gate[-1], 90) if gate else 'rebuilt')])
    elif name == 'screenshot':
        args = ', '.join(f'{a}: {json.dumps(inp[a])}' for a in ('as', 'route', 'width') if a in inp)
        call = f'screenshot({{ {args} }})'
        if js and js.get('ok'):
            vp = js.get('viewport', {})
            out.append(['ok', f"ok · {js.get('url')} · {vp.get('width')}×{vp.get('height')} · {len(js.get('errors', []))} errors"])
        else:
            out.append(['err', trunc(text, 100)])
        if want_shot and images:
            shot_n += 1
            shot = f'shots/{shot_n:02d}.png'
            open(os.path.join(out_dir, shot), 'wb').write(base64.b64decode(images[0]))
    elif name == 'verify':
        call = 'verify()'
        rep = (js or {}).get('report')
        if not rep:
            out.append(['err', trunc(text)])
        else:
            for st in rep.get('stages', []):
                for ch in st.get('checks', []):
                    kind = {'pass': 'ok', 'fail': 'err'}.get(ch['status'], 'dim')
                    mark = {'pass': '✓', 'fail': '✗', 'warn': '!', 'skipped': '–'}.get(ch['status'], '·')
                    ev = ch.get('evidence', '')
                    if ch['status'] == 'fail' and ch.get('items'):
                        ev += ': ' + '; '.join(ch['items'])
                    out.append([kind, f"{mark} {st['stage']}/{ch['id']}  {trunc(ev, 80)}"])
            out.append(['ok' if rep['status'] == 'pass' else 'err', f"status: {rep['status']} · {round(rep.get('ms', 0) / 1000)} s"])
    elif name == 'deploy':
        call = 'deploy(' + json.dumps(inp, separators=(', ', ': ')) + ')'
        if js and js.get('url'):
            out.append(['ok', f"{js.get('status')} · {js['url']} · {round(js.get('durationMs', 0) / 1000)} s"])
        else:
            out.append(['err', trunc(text)])
    else:
        call = f'{name}(…)'
        out.append(['dim', trunc(text)])
    return {'kind': 'call', 'tool': name, 'call': call, 'out': out, 'shot': shot, 'n': k + 1}

steps = []
for st in sb['steps']:
    if st.get('prompt'):
        lines = open(rel(sb['prompt'])).read().splitlines()
        lines = [l for l in lines if l.strip() and not l.startswith('Project id')][: sb.get('promptLines', 8)]
        steps.append({'kind': 'prompt', 'lines': [trunc(l, 100) for l in lines]})
    elif 'say' in st:
        steps.append({'kind': 'say', 'text': trunc(texts_before.get(st['say'], ''), 150)})
    elif 'uses' in st:
        a, b = st['uses']
        names = [short(uses[i]['name']) for i in range(a, b + 1)]
        secs = [uses[i]['input'].get('section') for i in range(a, b + 1) if uses[i]['input'].get('section')]
        steps.append({'kind': 'call', 'tool': names[0], 'n': b + 1, 'call': st.get('label') or f'{names[0]}() × {len(names)}',
                      'out': [['dim', 'sections: ' + ', '.join(secs)]] if secs else [], 'shot': None})
    elif 'use' in st:
        s = condense(st['use'], st.get('shot', False))
        if st.get('chapter'):
            s['chapter'] = st['chapter']
        steps.append(s)
    if st.get('chapter') and steps:
        steps[-1]['chapter'] = st['chapter']

json.dump({'title': sb.get('title'), 'app': sb.get('app'), 'steps': steps,
           'toolCalls': len(uses)}, open(os.path.join(out_dir, 'replay.json'), 'w'), indent=1, ensure_ascii=False)
print(f'{len(steps)} steps, {shot_n} screenshots, from {len(uses)} tool calls -> {out_dir}')
