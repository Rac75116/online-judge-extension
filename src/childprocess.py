import subprocess, threading, queue

class child_process:
    def __init__(self, cmd : str):
        self.p=subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, encoding='utf8')
        self.q=queue.Queue()
        self.t=threading.Thread(target=self.enqueue_output)

    def enqueue_output(self):
        for line in iter(self.p.stdout.readline, ''):
            self.q.put(line)

    def write(self, txt : str):
        self.p.stdin.write(txt)
        self.p.stdin.flush()

    def finished(self):
        return self.p.poll() is None
    
    def readline(self):
        try:
            return self.q.get_nowait().strip()
        except:
            return ''
