import sys, subprocess, getpass
from childprocess import child_process
urls = { 'Atcoder':'https://atcoder.jp/',
         'Codeforces':'https://codeforces.com/',
         'yukicoder':'https://yukicoder.me/',
         'HackerRank':'https://www.hackerrank.com/',
         'Toph':'https://toph.co/'}
site = sys.argv[1]
'''
if site == 'Atcoder' or site == 'Codeforces':
    username=input('Username: ')
    password=getpass.getpass('Password: \033[?25l\033[2m(hidden)\033[0m')
    print('\033[?25h', end='')
    subprocess.run(f'oj login {urls[site]}')
'''
p = child_process(r'python C:\Users\tsout\Desktop\Projects\online-judge-extension\src\test.py')
p.write('1')
while not p.finished():
    s = p.readline()
    print(s, end='')
