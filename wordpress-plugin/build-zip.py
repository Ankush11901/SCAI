import zipfile, os, shutil

base = os.path.join(os.path.dirname(os.path.abspath(__file__)))
source = os.path.join(base, "seo-content-ai")
zippath = os.path.join(base, "seo-content-ai.zip")
public_dest = os.path.join(base, "..", "public", "seo-content-ai.zip")

with zipfile.ZipFile(zippath, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(source):
        for f in files:
            fullpath = os.path.join(root, f)
            relpath = os.path.relpath(fullpath, source).replace("\\", "/")
            entry = "seo-content-ai/" + relpath
            zf.write(fullpath, entry)

    print("Created", zippath)
    for info in zf.infolist()[:5]:
        print("  ", info.filename)

# Copy to public/ for static serving (avoids binary corruption via API routes)
shutil.copy2(zippath, public_dest)
print("Copied to", public_dest)
