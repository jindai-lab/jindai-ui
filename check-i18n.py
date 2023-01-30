import json
import glob
import os
import re
import shutil
from opencc import OpenCC
s2t = OpenCC('s2t').convert


def load_json(json_src):
    with open(json_src, 'r') as finp:
        return json.load(finp)


def grep_text(vue_src):
    src = open(vue_src).read()
    for i in re.findall(r'\$t\(([\'\"].*?[\'\"])([,\)])', src):
        name, args = i
        if args == ')':
            args = ''
        print(vue_src, name, args != '')
        yield name[1:-1], args


locales = {
    path: load_json(path) for path in glob.glob('src/plugins/locales/*.json')
}


ZHS_KEY = 'src/plugins/locales/zhs.json'
ZHT_KEY = 'src/plugins/locales/zht.json'

if ZHT_KEY not in locales:
    locales[ZHT_KEY] = {}

for k in locales[ZHS_KEY]:
    if k not in locales[ZHT_KEY]:
        locales[ZHT_KEY][k] = s2t(locales[ZHS_KEY][k])


for pwd, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.vue'):
            for name, args in grep_text(os.path.join(pwd, file)):
                for locale in locales.values():
                    if name and name not in locale:
                        locale[name] = name[0].upper(
                        ) + name[1:].lower().replace('-', ' ')
                        if args:
                            locale[name] += ' %{}'


for path, data in locales.items():
    if os.path.exists(path):
        shutil.copy(path, path + '.bak')
    with open(path, 'w') as fout:
        json.dump(data, fout, ensure_ascii=False, indent=4)
