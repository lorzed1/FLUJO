import os
import json

def fast_scan(root_dir):
    important_patterns = ['type', 'schema', 'model', 'service', 'controller', 'route', 'interface', 'api', 'dtos']
    ignore_dirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage']
    
    project_map = {
        "structure": {},
        "business_files": []
    }

    for root, dirs, files in os.walk(root_dir):
        # Filter ignored directories
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        rel_path = os.path.relpath(root, root_dir)
        if rel_path == '.':
            rel_path = 'root'
            
        for file in files:
            file_lower = file.lower()
            if any(p in file_lower for p in important_patterns) and (file.endswith('.ts') or file.endswith('.tsx') or file.endswith('.py') or file.endswith('.sql')):
                project_map["business_files"].append(os.path.join(rel_path, file))

    return project_map

if __name__ == "__main__":
    import sys
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    result = fast_scan(target)
    print(json.dumps(result, indent=2))
