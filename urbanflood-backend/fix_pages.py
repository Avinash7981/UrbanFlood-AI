import os
import glob

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'useCity()' not in content:
        return
        
    # We want to replace `const { currentCity, isCityConfigured } = useCity();`
    # with `const { currentCity, isCityConfigured, isLoading } = useCity();`
    
    if 'const { currentCity, isCityConfigured } = useCity();' in content:
        content = content.replace(
            'const { currentCity, isCityConfigured } = useCity();',
            'const { currentCity, isCityConfigured, isLoading } = useCity();'
        )
    elif 'const { currentCity, isCityConfigured, isLoading } = useCity();' in content:
        pass # Already updated
    else:
        print(f"Skipping {filepath} - could not find useCity signature")
        return
        
    # Then we find the `if (!isCityConfigured) {` block
    if 'if (!isCityConfigured) {' in content:
        loading_block = """
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading city data...</p>
      </div>
    );
  }

  if (!currentCity) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No city data available.</p>
      </div>
    );
  }

  if (!isCityConfigured) {"""
        
        # Only replace if not already there
        if 'if (isLoading)' not in content:
            content = content.replace('  if (!isCityConfigured) {', loading_block)
            
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Updated {filepath}")

for root, dirs, files in os.walk('/Users/macbookairm4/Desktop/UrbanFlood AI/urbanflood-ai/src/app'):
    for file in files:
        if file == 'page.tsx':
            process_file(os.path.join(root, file))
