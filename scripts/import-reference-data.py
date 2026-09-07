"""Extract declarative tables from a local Herringway/ebsrc checkout; no ROM required.
Usage: python3 scripts/import-reference-data.py /path/to/ebsrc
"""
import hashlib, json, re, subprocess, sys
from pathlib import Path
root = Path(sys.argv[1])
files = ['src/data/battle/backgrounds/scrolling_table.asm', 'src/data/sine_table.asm', 'src/data/battle/background_layer_table.asm', 'src/data/map/battle_groups_table.asm']
texts = [ (root / p).read_text() for p in files ]
files += ['include/constants/battlebgs.asm', 'include/structs.asm', 'src/misc/battlebgs/generate_frame.asm', 'src/misc/battlebgs/prepare_bg_offset_tables.asm', 'src/battle/load_battlebg.asm', 'src/unknown/C2/C2CFE5.asm']
scroll = [[int(v, 16) for v in re.findall(r'\$([0-9A-Fa-f]+)', line)] for line in texts[0].splitlines() if '.WORD' in line]
assert all(len(x) == 5 for x in scroll)
sine = [int(v,16) for v in re.findall(r'\.BYTE \$([0-9A-Fa-f]+)', texts[1])]
assert len(sine) == 256
constants = dict((k, int(v)) for k,v in re.findall(r'(\w+) = (\d+)', (root/'include/constants/battlebgs.asm').read_text()))
pairs = [[constants[n] for n in re.findall(r'BATTLEBG_LAYER::(\w+)', line)] for line in texts[2].splitlines() if '.WORD' in line]
groups = {}
for match in re.finditer(r'ENEMY_GROUP_(\d+):\s*(.*?)(?=\n\w+:|\Z)', texts[3], re.S):
    names = re.findall(r'\.WORD ENEMY::(\w+)', match[2].split('.BYTE $FF')[0])
    groups[int(match[1])] = list(dict.fromkeys(re.sub(r'_\d+$', '', n).replace('_',' ').title() for n in names))
scenes = {}
for group, pair in enumerate(pairs):
    if pair == [0,0]: continue
    key = ':'.join(map(str,pair))
    scene = scenes.setdefault(key, dict(id=key, layers=pair, groups=[], names=[]))
    scene['groups'].append(group)
    for name in groups.get(group, []):
        if name not in scene['names']: scene['names'].append(name)
for scene in scenes.values():
    scene['name'] = ' / '.join(scene['names'][:3]) or f"Battle group {scene['groups'][0]}"
output = dict(source='https://github.com/Herringway/ebsrc', commit=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip(), files={p: hashlib.sha256((root/p).read_bytes()).hexdigest() for p in files}, scrolling=scroll, sine=sine, scenes=list(scenes.values()))
Path('src/data/reference.json').write_text(json.dumps(output, indent=2)+'\n')
print(f"Imported {len(scroll)} scrolling entries and {len(scenes)} original pairings")
