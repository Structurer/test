import tkinter as tk

def generate_hash():
    input_text = text_box.get("1.0", "end-1c")  # 获取多行文本框中的文本
    # 这里可以实现生成哈希值的部分
    print("生成的哈希值：", input_text)  # 当前只是打印输入值，哈希部分可以按需添加

# 创建主窗口
root = tk.Tk()
root.title("Hash Generator")

# 设置窗口大小及最小大小
root.geometry("400x600")  # 初始窗口大小，宽度400px，高度300px
root.minsize(400, 600)  # 最小窗口大小，宽度300px，高度250px
root.maxsize(400, 600)

# 创建标签
label = tk.Label(root, text="请输入：")
label.grid(row=0, column=0, pady=5)

# 创建多行文本框
text_box = tk.Text(root, height=10)  # 高度设置为10行，宽度不设置
text_box.grid(row=1, column=0, padx=10, pady=10, sticky="ew")  # sticky="ew" 让它横向填充父容器

# 创建按钮
button = tk.Button(root, text="生成哈希", command=generate_hash)
button.grid(row=2, column=0, pady=20)

# 让列宽自适应
root.grid_columnconfigure(0, weight=1)

# 运行窗口
root.mainloop()
