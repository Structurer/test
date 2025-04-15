import hashlib
import os
from openpyxl import Workbook
import time


def calculate_sha256(file_path):
    hash_sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()


def calculate_total_file_size(folder_path):
    total_size = 0
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            total_size += os.path.getsize(file_path)
    return total_size


def process_folder(folder_path):
    wb = Workbook()
    ws = wb.active
    ws.append(["文件名", "文件路径", "SHA256 哈希值"])

    start_time = None
    total_size_so_far = 0
    total_file_size = calculate_total_file_size(folder_path)
    elapsed_time = 0
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            file_size = os.path.getsize(file_path)
            if start_time is None:
                start_time = time.time()
            hash_value = calculate_sha256(file_path)
            ws.append([file, file_path, hash_value])
            total_size_so_far += file_size
            progress_percentage = (total_size_so_far / total_file_size) * 100 if total_file_size > 0 else 0
            elapsed_time = time.time() - start_time
            estimated_total_time = elapsed_time / (progress_percentage / 100) if progress_percentage > 0 else 0
            estimated_remaining_time = estimated_total_time - elapsed_time if estimated_total_time > 0 else 0
            print(f"已处理文件: {file_path}, 已处理文件总大小: {total_size_so_far} 字节, "
                  f"进度: {progress_percentage:.2f}%, 已用时间: {elapsed_time:.2f} 秒, "
                  f"预计总计时间: {estimated_total_time:.2f} 秒, 预估剩余时间: {estimated_remaining_time:.2f} 秒")

    wb.save("file_hashes.xlsx")
    return total_size_so_far, elapsed_time


if __name__ == "__main__":
    folder_path = "E:\DJI_VEDIO"  # 请将此处替换为实际的文件夹路径
    total_size = calculate_total_file_size(folder_path)
    print(f"文件夹内所有文件的总大小为: {total_size} 字节")
    size_so_far, elapsed_time = process_folder(folder_path)
    print(f"从开始到当前，计算出哈希值的所有文件总大小为: {size_so_far} 字节, 总共用时: {elapsed_time:.2f} 秒")