
def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in '{[(':
                stack.append((char, i+1, j+1))
            elif char in '}])':
                if not stack:
                    print(f"Extra closing char '{char}' at {i+1}:{j+1}")
                    continue
                last_char, l, c = stack.pop()
                if (char == '}' and last_char != '{') or \
                   (char == ']' and last_char != '[') or \
                   (char == ')' and last_char != '('):
                    print(f"Mismatched char: '{last_char}' at {l}:{c} closed by '{char}' at {i+1}:{j+1}")
    
    for char, l, c in stack:
        print(f"Unclosed char '{char}' at {l}:{c}")

check_balance('c:/Procurement_Project/Procurement/Bait_Storage/frontend/src/components/InboundPage.jsx')
