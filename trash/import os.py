import os
import hashlib

def calculate_sha256(file_path):
    """
    计算文件的 SHA-256 哈希值
    :param file_path: 文件的路径
    :return: 文件的 SHA-256 哈希值
    """
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            # 分块读取文件，避免大文件占用过多内存
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
        return None

def find_duplicate_files(folder_path):
    """
    查找指定文件夹内的重复文件
    :param folder_path: 文件夹的路径
    :return: 重复文件的字典，键为哈希值，值为文件路径列表
    """
    hash_dict = {}
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            file_hash = calculate_sha256(file_path)
            if file_hash:
                if file_hash in hash_dict:
                    hash_dict[file_hash].append(file_path)
                else:
                    hash_dict[file_hash] = [file_path]
    # 筛选出重复的文件
    duplicate_files = {k: v for k, v in hash_dict.items() if len(v) > 1}
    return duplicate_files

def remove_duplicate_files(duplicate_files):
    """
    删除重复文件，只保留每个重复组中的第一个文件
    :param duplicate_files: 重复文件的字典，键为哈希值，值为文件路径列表
    """
    for file_list in duplicate_files.values():
        # 保留第一个文件，删除其余重复文件
        for file_path in file_list[1:]:
            try:
                os.remove(file_path)
                print(f"Deleted duplicate file: {file_path}")
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")

def main(folder_path):
    """
    主函数，执行文件去重操作
    :param folder_path: 要去重的文件夹路径
    """
    duplicate_files = find_duplicate_files(folder_path)
    if duplicate_files:
        print("Duplicate files found:")
        for hash_value, file_list in duplicate_files.items():
            print(f"Hash: {hash_value}")
            for file_path in file_list:
                print(f"  - {file_path}")
        remove_duplicate_files(duplicate_files)
    else:
        print("No duplicate files found.")

if __name__ == "__main__":
    # 请替换为你要去重的文件夹路径
    folder_path = "123"
    main(folder_path)
