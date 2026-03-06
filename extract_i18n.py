#!/usr/bin/env python3
"""
i18n String Extractor for React JSX files

This script:
1. Scans all JSX files in the source directory
2. Extracts hardcoded Chinese strings that need internationalization
3. Generates a language package (JSON format)
4. Adds i18n imports to JSX files
5. Replaces hardcoded strings with t() function calls
"""

import os
import re
import json
import ast
from pathlib import Path
from typing import Set, Dict, List, Tuple
import argparse


class I18nExtractor:
    """Extracts i18n strings from JSX files"""
    
    # Patterns to match Chinese strings in JSX
    CHINESE_STRING_PATTERNS = [
        # Single-quoted strings with Chinese characters
        r"'([^'\"{]*[\u4e00-\u9fa5][^'\"{}]*)'",
        # Double-quoted strings with Chinese characters  
        r'"([^"\'{]*[\u4e00-\u9fa5][^"\'{}]*)"',
        # Template literals with Chinese characters
        r'`([^`{]*[\u4e00-\u9fa5][^`]*)`',
    ]
    
    # Patterns to exclude (already i18n wrapped, variables, etc.)
    EXCLUDE_PATTERNS = [
        r'^\s*$',  # Empty strings
        r'^[a-zA-Z0-9_\-\.\/\:@]+$',  # URLs, paths, identifiers
        r'^[A-Z][a-zA-Z0-9]*$',  # PascalCase (likely component names)
        r'^[a-z]+[A-Z]',  # camelCase (likely variables)
        r'^[A-Z_]+$',  # UPPER_CASE (likely constants)
        r'^[0-9]+$',  # Pure numbers
        r'^[0-9]+\.[0-9]+$',  # Floats
        r'^\$\{.*\}$',  # Template variable placeholders
        r'^[a-z]{2}(-[A-Z]{2})?$',  # Language codes like 'zh-CN', 'en'
    ]
    
    def __init__(self, source_dir: str = "src"):
        self.source_dir = Path(source_dir)
        self.strings: Set[str] = set()
        self.string_locations: Dict[str, List[Tuple[str, int, str]]] = {}  # file -> [(line, col, string)]
        self.extraction_stats = {
            'files_scanned': 0,
            'strings_found': 0,
            'strings_excluded': 0,
            'strings_extracted': 0
        }
    
    def is_excluded(self, text: str) -> bool:
        """Check if a string should be excluded from i18n"""
        text = text.strip()
        
        # Skip empty strings
        if not text:
            return True
        
        # Skip if it matches any exclude pattern
        for pattern in self.EXCLUDE_PATTERNS:
            if re.match(pattern, text):
                return True
        
        # Skip if it's mostly symbols/numbers (likely not user-facing text)
        non_symbol_count = len(re.findall(r'[\u4e00-\u9fa5a-zA-Z]', text))
        total_count = len(re.sub(r'\s', '', text))
        if total_count > 0 and non_symbol_count / total_count < 0.3:
            return True
        
        # Skip if it's a JSX attribute value that's not visible text
        if text.startswith(('http://', 'https://', '/', '#', 'data-', 'src=', 'value=')):
            return True
        
        # Skip if it's a CSS class name or style property
        if re.match(r'^[a-zA-Z0-9_-]+$', text) and (' ' not in text):
            return True
        
        return False
    
    def extract_from_file(self, file_path: Path) -> List[Tuple[int, int, str]]:
        """Extract Chinese strings from a single file"""
        locations = []
        
        try:
            content = file_path.read_text(encoding='utf-8')
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return locations
        
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Skip comments
            if line.strip().startswith('//') or line.strip().startswith('/*'):
                continue
            
            # Find all potential Chinese strings
            for pattern in self.CHINESE_STRING_PATTERNS:
                for match in re.finditer(pattern, line):
                    string_content = match.group(1)
                    
                    # Skip if excluded
                    if self.is_excluded(string_content):
                        self.extraction_stats['strings_excluded'] += 1
                        continue
                    
                    # Skip if it's a variable reference
                    if '{' in string_content or '}' in string_content:
                        continue
                    
                    # Skip if it's a JSX prop value (common patterns)
                    if self._is_jsx_prop_value(line, match):
                        continue
                    
                    # Clean up the string
                    cleaned = self._clean_string(string_content)
                    if cleaned and not self.is_excluded(cleaned):
                        locations.append((line_num, match.start(1), cleaned))
                        self.strings.add(cleaned)
        
        return locations
    
    def _is_jsx_prop_value(self, line: str, match) -> bool:
        """Check if the match is a JSX prop value rather than visible text"""
        start = match.start()
        
        # Check if it's inside a JSX prop (before =)
        before_match = line[:start]
        if '=' in before_match and '{' not in before_match:
            # Check if it's a known prop that doesn't need i18n
            props_to_skip = ['key', 'className', 'style', 'id', 'title']
            for prop in props_to_skip:
                if f'{prop}=' in before_match:
                    return True
        
        return False
    
    def _clean_string(self, text: str) -> str:
        """Clean up a string for i18n"""
        # Remove leading/trailing whitespace
        text = text.strip()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text
    
    def scan_directory(self) -> None:
        """Scan all JSX files in the source directory"""
        jsx_files = list(self.source_dir.rglob('*.jsx')) + list(self.source_dir.rglob('*.js'))
        
        for file_path in jsx_files:
            self.extraction_stats['files_scanned'] += 1
            locations = self.extract_from_file(file_path)
            
            if locations:
                rel_path = str(file_path.relative_to(self.source_dir))
                self.string_locations[rel_path] = locations
                self.extraction_stats['strings_found'] += len(locations)
        
        self.extraction_stats['strings_extracted'] = len(self.strings)
    
    def get_language_package(self, lang_code: str = 'zh-CN') -> Dict:
        """Generate a language package structure"""
        package = {
            "language": lang_code,
            "name": "Chinese (Simplified)" if lang_code == 'zh-CN' else "Chinese (Traditional)",
            "strings": {}
        }
        
        for s in sorted(self.strings):
            # Generate a key from the string (snake_case version)
            key = self._string_to_key(s)
            package["strings"][key] = s
        
        return package
    
    def _string_to_key(self, text: str) -> str:
        """Convert a string to a snake_case key for the language package"""
        # Remove special characters and convert to snake_case
        text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s]', '', text)
        text = text.strip()
        
        # Convert spaces to underscores
        key = text.replace(' ', '_')
        
        # Convert to lowercase
        key = key.lower()
        
        # Add prefix if it starts with a number
        if key and key[0].isdigit():
            key = 'num_' + key
        
        return key


class I18nInjector:
    """Injects i18n imports and replaces strings in JSX files"""
    
    def __init__(self, source_dir: str = "src"):
        self.source_dir = Path(source_dir)
        self.language_package: Dict = {}
        self.replacements_made: Dict[str, List[Tuple[int, str, str]]] = {}
    
    def load_language_package(self, package_path: str) -> None:
        """Load an existing language package"""
        with open(package_path, 'r', encoding='utf-8') as f:
            self.language_package = json.load(f)
    
    def create_language_package(self, extractor: I18nExtractor, output_path: str) -> None:
        """Create a new language package from extracted strings"""
        package = extractor.get_language_package()
        
        # Save the package
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(package, f, ensure_ascii=False, indent=2)
        
        self.language_package = package
        print(f"Language package created: {output_path}")
    
    def _get_string_key(self, string: str) -> str:
        """Get the key for a string in the language package"""
        if not self.language_package:
            return None
        
        strings = self.language_package.get("strings", {})
        for key, value in strings.items():
            if value == string:
                return key
        return None
    
    def _create_t_call(self, string: str) -> str:
        """Create a t() function call for a string"""
        key = self._get_string_key(string)
        if key:
            return ft("{key}")
        return ft("{string}")
    
    def inject_to_file(self, file_path: Path) -> bool:
        """Inject i18n imports and replace strings in a file"""
        try:
            content = file_path.read_text(encoding='utf-8')
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return False
        
        # Check if already has i18n import
        if 'useTranslation' in content or 'i18next' in content:
            print(f"Skipping {file_path}: already has i18n imports")
            return False
        
        # Get string locations for this file
        rel_path = str(file_path.relative_to(self.source_dir))
        locations = []
        
        for file, locs in self.string_locations.items():
            if rel_path.endswith(file) or file.endswith(rel_path):
                locations = locs
                break
        
        if not locations:
            return False
        
        # Sort by line number (descending) to replace from bottom to top
        locations.sort(key=lambda x: x[0], reverse=True)
        
        lines = content.split('\n')
        replacements = []
        
        for line_num, col, string in locations:
            if line_num > len(lines):
                continue
            
            line = lines[line_num - 1]
            
            # Find the string in the line (with quotes)
            # We need to match the quoted string to replace it correctly
            # Try double-quoted first, then single-quoted
            quoted_pattern = rf'["\']({re.escape(string)})["\']'
            match = re.search(quoted_pattern, line)
            
            if match:
                # Create the replacement - replace the entire quoted string
                t_call = self._create_t_call(string)
                new_line = line[:match.start()] + t_call + line[match.end():]
                lines[line_num - 1] = new_line
                replacements.append((line_num, string, t_call))
        
        if replacements:
            # Add i18n import at the top (after other imports)
            new_content = self._add_i18n_import('\n'.join(lines))
            
            # Write the modified content
            file_path.write_text(new_content, encoding='utf-8')
            
            self.replacements_made[str(file_path)] = replacements
            return True
        
        return False
    
    def _add_i18n_import(self, content: str) -> str:
        """Add i18n imports to the file"""
        # Check if already imported
        if 'useTranslation' in content:
            return content
        
        # Find the last import statement
        lines = content.split('\n')
        import_end = 0
        
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                import_end = i
        
        # Add the i18n import after the last import
        i18n_import = 'import { useTranslation } from "react-i18next";'
        
        # Check if react-i18next is already imported
        has_react_i18next = any('react-i18next' in line for line in lines)
        
        if not has_react_i18next:
            lines.insert(import_end + 1, i18n_import)
        
        # Add t function to components that use i18n
        lines = self._add_t_function(lines)
        
        return '\n'.join(lines)
    
    def _add_t_function(self, lines: List[str]) -> List[str]:
        """Add t function declaration to components"""
        t_function_added = False
        
        for i, line in enumerate(lines):
            # Look for component function declarations
            if re.match(r'^const\s+\w+\s*=\s*\(', line) or re.match(r'^export\s+(default\s+)?function\s+\w+', line):
                # Find the opening brace of the function
                for j in range(i, min(i + 10, len(lines))):
                    if '{' in lines[j]:
                        # Add t function after the opening brace
                        indent = len(lines[j]) - len(lines[j].lstrip())
                        t_line = ' ' * indent + 'const { t } = useTranslation();'
                        
                        # Check if already added
                        if 'useTranslation' not in ''.join(lines[j:j+3]):
                            lines.insert(j + 1, t_line)
                            t_function_added = True
                        break
                break
        
        return lines
    
    def generate_report(self) -> str:
        """Generate a report of replacements made"""
        report = ["\n=== i18n Injection Report ===\n"]
        
        total_replacements = 0
        for file_path, replacements in self.replacements_made.items():
            report.append(f"\nFile: {file_path}")
            report.append(f"  Replacements: {len(replacements)}")
            for line_num, old, new in replacements:
                report.append(f"    Line {line_num}: \"{old}\" -> {new}")
            total_replacements += len(replacements)
        
        report.append(f"\n=== Summary ===")
        report.append(f"Total files modified: {len(self.replacements_made)}")
        report.append(f"Total replacements: {total_replacements}")
        
        return '\n'.join(report)


def main():
    parser = argparse.ArgumentParser(description='Extract and inject i18n strings in JSX files')
    parser.add_argument('--source-dir', default='src', help='Source directory containing JSX files')
    parser.add_argument('--output-package', default='src/i18n/zh-CN.json', help='Output path for language package')
    parser.add_argument('--inject', action='store_true', help='Inject i18n imports and replace strings')
    parser.add_argument('--dry-run', action='store_true', help='Only extract strings without modifying files')
    
    args = parser.parse_args()
    
    # Create extractor
    extractor = I18nExtractor(args.source_dir)
    
    # Scan for strings
    print(f"Scanning {args.source_dir} for JSX files...")
    extractor.scan_directory()
    
    # Print extraction stats
    print(f"\n=== Extraction Statistics ===")
    print(f"Files scanned: {extractor.extraction_stats['files_scanned']}")
    print(f"Strings found: {extractor.extraction_stats['strings_found']}")
    print(f"Strings excluded: {extractor.extraction_stats['strings_excluded']}")
    print(f"Strings extracted: {extractor.extraction_stats['strings_extracted']}")
    
    # Print extracted strings
    if extractor.strings:
        print(f"\n=== Extracted Strings ({len(extractor.strings)}) ===")
        for s in sorted(extractor.strings):
            print(f"  - {s}")
    
    # Create language package
    package = extractor.get_language_package()
    package_path = Path(args.output_package)
    package_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(package_path, 'w', encoding='utf-8') as f:
        json.dump(package, f, ensure_ascii=False, indent=2)
    
    print(f"\nLanguage package saved to: {package_path}")
    
    # Inject i18n if requested
    if args.inject and not args.dry_run:
        injector = I18nInjector(args.source_dir)
        injector.language_package = package
        injector.string_locations = extractor.string_locations
        
        # Find all JSX files
        source_dir = Path(args.source_dir)
        jsx_files = list(source_dir.rglob('*.jsx')) + list(source_dir.rglob('*.js'))
        
        print(f"\n=== Injecting i18n ===")
        for file_path in jsx_files:
            if injector.inject_to_file(file_path):
                print(f"  Modified: {file_path}")
        
        print(injector.generate_report())


if __name__ == '__main__':
    main()
