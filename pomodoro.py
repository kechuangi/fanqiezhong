import tkinter as tk
from tkinter import messagebox

WORK_MINUTES = 25
SHORT_BREAK_MINUTES = 5
LONG_BREAK_MINUTES = 15
SESSIONS_BEFORE_LONG_BREAK = 4


class PomodoroApp:
    def __init__(self, root):
        self.root = root
        self.root.title("番茄钟")
        self.root.geometry("360x420")
        self.root.resizable(False, False)
        self.root.configure(bg="#f7f2ef")

        self.mode = "work"
        self.is_running = False
        self.remaining_seconds = WORK_MINUTES * 60
        self.completed_sessions = 0
        self.timer_id = None

        self.title_label = tk.Label(
            root,
            text="专注时间",
            font=("Microsoft YaHei UI", 22, "bold"),
            bg="#f7f2ef",
            fg="#3d2c2e",
        )
        self.title_label.pack(pady=(32, 8))

        self.timer_label = tk.Label(
            root,
            text=self.format_time(self.remaining_seconds),
            font=("Consolas", 54, "bold"),
            bg="#f7f2ef",
            fg="#d64242",
        )
        self.timer_label.pack(pady=10)

        self.status_label = tk.Label(
            root,
            text="完成 0 / 4 个专注周期",
            font=("Microsoft YaHei UI", 11),
            bg="#f7f2ef",
            fg="#6f5d5d",
        )
        self.status_label.pack(pady=(0, 24))

        button_frame = tk.Frame(root, bg="#f7f2ef")
        button_frame.pack(pady=6)

        self.start_button = tk.Button(
            button_frame,
            text="开始",
            width=9,
            command=self.toggle_timer,
            font=("Microsoft YaHei UI", 11),
        )
        self.start_button.grid(row=0, column=0, padx=5)

        self.reset_button = tk.Button(
            button_frame,
            text="重置",
            width=9,
            command=self.reset_timer,
            font=("Microsoft YaHei UI", 11),
        )
        self.reset_button.grid(row=0, column=1, padx=5)

        self.skip_button = tk.Button(
            button_frame,
            text="跳过",
            width=9,
            command=self.skip_current,
            font=("Microsoft YaHei UI", 11),
        )
        self.skip_button.grid(row=0, column=2, padx=5)

        preset_frame = tk.LabelFrame(
            root,
            text="快速切换",
            font=("Microsoft YaHei UI", 10),
            bg="#f7f2ef",
            fg="#3d2c2e",
            padx=8,
            pady=8,
        )
        preset_frame.pack(pady=(24, 0))

        tk.Button(
            preset_frame,
            text="专注 25 分钟",
            width=12,
            command=lambda: self.set_mode("work"),
            font=("Microsoft YaHei UI", 10),
        ).grid(row=0, column=0, padx=4)

        tk.Button(
            preset_frame,
            text="短休 5 分钟",
            width=12,
            command=lambda: self.set_mode("short_break"),
            font=("Microsoft YaHei UI", 10),
        ).grid(row=0, column=1, padx=4)

        tk.Button(
            preset_frame,
            text="长休 15 分钟",
            width=12,
            command=lambda: self.set_mode("long_break"),
            font=("Microsoft YaHei UI", 10),
        ).grid(row=1, column=0, columnspan=2, pady=(8, 0))

        self.root.protocol("WM_DELETE_WINDOW", self.close)

    def format_time(self, total_seconds):
        minutes, seconds = divmod(total_seconds, 60)
        return f"{minutes:02d}:{seconds:02d}"

    def toggle_timer(self):
        if self.is_running:
            self.pause_timer()
        else:
            self.start_timer()

    def start_timer(self):
        self.is_running = True
        self.start_button.config(text="暂停")
        self.tick()

    def pause_timer(self):
        self.is_running = False
        self.start_button.config(text="继续")
        if self.timer_id is not None:
            self.root.after_cancel(self.timer_id)
            self.timer_id = None

    def reset_timer(self):
        self.pause_timer()
        self.completed_sessions = 0
        self.set_mode("work")
        self.start_button.config(text="开始")

    def skip_current(self):
        self.finish_current(show_message=False)

    def set_mode(self, mode):
        self.pause_timer()
        self.mode = mode
        if mode == "work":
            self.remaining_seconds = WORK_MINUTES * 60
            self.title_label.config(text="专注时间")
            self.timer_label.config(fg="#d64242")
        elif mode == "short_break":
            self.remaining_seconds = SHORT_BREAK_MINUTES * 60
            self.title_label.config(text="短暂休息")
            self.timer_label.config(fg="#2f8f5b")
        else:
            self.remaining_seconds = LONG_BREAK_MINUTES * 60
            self.title_label.config(text="长休息")
            self.timer_label.config(fg="#2f6f8f")

        self.start_button.config(text="开始")
        self.update_display()

    def tick(self):
        self.update_display()
        if not self.is_running:
            return

        if self.remaining_seconds <= 0:
            self.finish_current(show_message=True)
            return

        self.remaining_seconds -= 1
        self.timer_id = self.root.after(1000, self.tick)

    def finish_current(self, show_message):
        self.pause_timer()
        if self.mode == "work":
            self.completed_sessions += 1
            next_mode = (
                "long_break"
                if self.completed_sessions % SESSIONS_BEFORE_LONG_BREAK == 0
                else "short_break"
            )
            if show_message:
                messagebox.showinfo("番茄钟", "专注结束，起来休息一下吧！")
            self.set_mode(next_mode)
        else:
            if show_message:
                messagebox.showinfo("番茄钟", "休息结束，开始新的专注吧！")
            self.set_mode("work")

    def update_display(self):
        self.timer_label.config(text=self.format_time(self.remaining_seconds))
        self.status_label.config(
            text=f"完成 {self.completed_sessions % SESSIONS_BEFORE_LONG_BREAK} / {SESSIONS_BEFORE_LONG_BREAK} 个专注周期"
        )

    def close(self):
        if self.timer_id is not None:
            self.root.after_cancel(self.timer_id)
        self.root.destroy()


def main():
    root = tk.Tk()
    PomodoroApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
