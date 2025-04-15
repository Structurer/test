import os
import hashlib
import pandas as pd


def get_file_hash(file_path):
    """
    计算文件的 SHA256 哈希值
    :param file_path: 文件路径
    :return: 文件的 SHA256 哈希值
    """
    hash_object = hashlib.sha256()
    try:
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_object.update(chunk)
        return hash_object.hexdigest()
    except Exception as e:
        print(f"读取文件 {file_path} 时出错: {e}")
        return None


def get_file_info(folder):
    """
    获取文件夹内所有文件的信息（文件名、路径、哈希值）
    :param folder: 文件夹路径
    :return: 包含文件信息的列表
    """
    file_info_list = []
    for root, _, files in os.walk(folder):
        for file in files:
            file_path = os.path.join(root, file)
            file_hash = get_file_hash(file_path)
            file_info_list.append({
                "name": file,
                "path": file_path,
                "hash": file_hash
            })
    return file_info_list


def compare_folders(folder1, folder2):
    """
    比较两个文件夹内的文件，生成表格并输出对比结果
    :param folder1: 第一个文件夹路径
    :param folder2: 第二个文件夹路径
    :return: 包含比较结果的 DataFrame
    """
    info1 = get_file_info(folder1)
    info2 = get_file_info(folder2)

    results = []
    for file1 in info1:
        found = False
        for file2 in info2:
            if file1["hash"] == file2["hash"]:
                found = True
                break
        result = "是" if found else "否"
        results.append({
            "文件名": file1['name'],
            "文件路径": file1['path'],
            "哈希值": file1['hash'],
            "是否在文件夹2中存在相同内容文件": result
        })

    df = pd.DataFrame(results)
    return df


if __name__ == "__main__":
    folder1 = input("请输入第一个文件夹的地址: ")
    folder2 = input("请输入第二个文件夹的地址: ")
    result_df = compare_folders(folder1, folder2)

    # 获取当前 Python 脚本所在的目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_file_path = os.path.join(script_dir, "file_comparison_result.xlsx")

    # 将结果保存到 Excel 文件
    result_df.to_excel(excel_file_path, index=False)
    print(f"比较结果已保存到 {excel_file_path}")
    