import re,sys,html
x=open(r'C:/Reclaim/.eif/audit/N-0073/ui.xml',encoding='utf-8').read()
for m in re.finditer(r'<node [^>]*?text="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?bounds="(\[[^"]*\])"',x):
    t=html.unescape(m.group(1) or m.group(2))
    if t.strip() and (len(sys.argv)<2 or sys.argv[1].lower() in t.lower()): print(m.group(3), t[:110])
