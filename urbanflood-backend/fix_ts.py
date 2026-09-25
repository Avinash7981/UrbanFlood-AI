import os

def fix_ts_errors(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace currentCity.id with currentCity?.id where it's assigned before the early return
    if "currentCity.id ===" in content:
        content = content.replace("currentCity.id ===", "currentCity?.id ===")
    
    if "currentCity.name" in content:
        # We need to make sure we don't blindly replace it if it's already safe or if we want to default
        # But actually currentCity?.name is valid JSX
        content = content.replace("{currentCity.name}", "{currentCity?.name}")
        content = content.replace("${currentCity.name}", "${currentCity?.name || 'Selected city'}")
        
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Fixed TS in {filepath}")

for root, dirs, files in os.walk('/Users/macbookairm4/Desktop/UrbanFlood AI/urbanflood-ai/src/app'):
    for file in files:
        if file == 'page.tsx':
            fix_ts_errors(os.path.join(root, file))
