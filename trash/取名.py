import os
from openpyxl import Workbook


def list_files_in_folder(folder_path):
    file_names = []
    for entry in os.scandir(folder_path):
        if entry.is_file():
            file_names.append(entry.name)
    return file_names


def write_to_excel(file_names):
    current_dir = os.getcwd()
    excel_path = os.path.join(current_dir, 'output.xlsx')
    wb = Workbook()
    ws = wb.active
    for index, file_name in enumerate(file_names, start=1):
        ws.cell(row=index, column=1, value=file_name)
    wb.save(excel_path)
    print(f"文件名已成功写入到 {excel_path}")


if __name__ == "__main__":
    folder_path = input("请输入文件夹路径: ")
    files = list_files_in_folder(folder_path)
    write_to_excel(files)