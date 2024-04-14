import sys, subprocess, getpass
urls = { 'Atcoder':'https://atcoder.jp/',
         'Codeforces':'https://codeforces.com/',
         'yukicoder':'https://yukicoder.me/',
         'HackerRank':'https://www.hackerrank.com/',
         'Toph':'https://toph.co/'}
site = sys.argv[1]
#username=input('Username: ')
#password=getpass.getpass('Password: \033[?25l\033[2m(hidden)\033[0m')
#print('\033[?25h', end='')
subprocess.run(f'oj login {urls[site]}')
#p = child_process(r'python C:\Users\tsout\Desktop\Projects\online-judge-extension\src\test.py')
