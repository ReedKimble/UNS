from pathlib import Path
text = Path(r"Examples/Web App IDE/uns_runtime_app.html").read_text()
start = text.index('(() => {')
end = text.rindex('})();')
Path('tmp_uns_runtime_app.js').write_text(text[start:end+4])
