#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para analisar funções JavaScript e identificar quais não são chamadas.
Focado em encontrar funções nos arquivos 4.txt e 6.txt (ou seções equivalentes).
"""

import re
import os
from collections import defaultdict

def extract_functions_from_html(html_file):
    """Extrai todas as funções JavaScript do arquivo HTML."""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    functions = {}
    
    # Padrões para encontrar funções
    patterns = [
        # function nomeFuncao() ou async function nomeFuncao()
        r'(?:async\s+)?function\s+(\w+)\s*\(',
        # var nomeFuncao = function() ou const nomeFuncao = function()
        r'(?:var|let|const)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(',
        # window.nomeFuncao = function() ou objeto.nomeFuncao = function()
        r'(?:\w+\.)?(\w+)\s*=\s*(?:async\s+)?function\s*\(',
        # nomeFuncao: function() (em objetos)
        r'(\w+)\s*:\s*(?:async\s+)?function\s*\(',
    ]
    
    for pattern in patterns:
        for match in re.finditer(pattern, content):
            func_name = match.group(1)
            if func_name and func_name not in ['if', 'for', 'while', 'switch', 'catch']:
                start_pos = match.start()
                # Tenta encontrar a linha
                line_num = content[:start_pos].count('\n') + 1
                functions[func_name] = {
                    'line': line_num,
                    'pattern': pattern
                }
    
    return functions, content

def find_function_calls(content, function_name):
    """Encontra todas as chamadas de uma função no conteúdo."""
    # Padrões para chamadas de função
    patterns = [
        rf'\b{re.escape(function_name)}\s*\(',
        rf'\.{re.escape(function_name)}\s*\(',
        rf'\[[\'"]{re.escape(function_name)}[\'"]\]\s*\(',
        rf'onclick\s*=\s*["\']{re.escape(function_name)}\s*\(',
        rf'onclick\s*=\s*{re.escape(function_name)}\s*\(',
    ]
    
    calls = []
    for pattern in patterns:
        for match in re.finditer(pattern, content, re.IGNORECASE):
            line_num = content[:match.start()].count('\n') + 1
            calls.append((line_num, match.group(0)))
    
    return calls

def analyze_unused_functions(html_file):
    """Analisa o HTML e identifica funções não utilizadas."""
    print(f"Analisando {html_file}...")
    functions, content = extract_functions_from_html(html_file)
    
    print(f"\nTotal de funções encontradas: {len(functions)}")
    
    unused = []
    used = []
    
    for func_name, func_info in functions.items():
        calls = find_function_calls(content, func_name)
        # Remove a própria definição da função
        calls = [c for c in calls if c[0] != func_info['line']]
        
        if not calls:
            unused.append((func_name, func_info['line']))
        else:
            used.append((func_name, func_info['line'], len(calls)))
    
    return unused, used, functions

if __name__ == '__main__':
    html_file = 'index.html'
    if os.path.exists(html_file):
        unused, used, all_functions = analyze_unused_functions(html_file)
        
        print(f"\n{'='*60}")
        print(f"FUNÇÕES NÃO UTILIZADAS: {len(unused)}")
        print(f"{'='*60}")
        for func_name, line in sorted(unused, key=lambda x: x[1]):
            print(f"  - {func_name} (linha {line})")
        
        print(f"\n{'='*60}")
        print(f"FUNÇÕES UTILIZADAS: {len(used)}")
        print(f"{'='*60}")
        for func_name, line, call_count in sorted(used[:20], key=lambda x: x[1]):  # Mostra apenas as primeiras 20
            print(f"  - {func_name} (linha {line}, {call_count} chamadas)")
        
        if len(used) > 20:
            print(f"  ... e mais {len(used) - 20} funções utilizadas")
    else:
        print(f"Arquivo {html_file} não encontrado!")

