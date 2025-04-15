import itertools
import matplotlib.pyplot as plt
from matplotlib import rcParams
# 设置matplotlib的字体为支持中文的字体，例如"SimHei"（黑体）
rcParams['font.family'] = 'SimHei'


# 定义扑克牌的点数、花色和对应的数值
numbers = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
number_values = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14}
suits = ['♠', '♥', '♣', '♦']

# 生成扑克牌列表，存储为键值对
cards = [{'number': number, 'value': number_values[number], 'suit': suit} for number in numbers for suit in suits]

# 生成所有3张牌的组合
combinations = list(itertools.combinations(cards, 3))

# print(len(combinations))
# print(combinations)

# 定义判断牌型的函数
def classify_hand(hand):
    """
    根据三张牌分类并评分
    """
    #手牌重组和排序
    values = sorted([card['value'] for card in hand], reverse=True) # 按点数从大到小排序
    suits = [card['suit'] for card in hand]

    unique_values = len(set(values))
    unique_suits = len(set(suits))

   # 定义点数比较值，降序排列形成元组
    compare_value = tuple(values)

    if unique_values == 1:  # 豹子
        return '豹子', 6, compare_value
    elif unique_suits == 1:  # 如果花色相同
        # 检查是否是顺金（连续顺子）
        if (values[0] - values[2] == 2 and unique_values == 3) or (values == [14, 3, 2]):  # 顺子金花
            return '顺金', 5, compare_value
        else:  # 普通金花
            return '普金', 4, compare_value

    elif (values[0] - values[2] == 2 and unique_values == 3) or (values == [14, 3, 2]):  # 普通顺子
        return '普顺', 3, compare_value
    elif unique_values == 2:  # 对子
        # 确保对子在比较值中排在前两位，例如：[10, 10, 5] → (10, 10, 5)
        pair_value = [v for v in values if values.count(v) == 2][0]  # 对子的值
        single_value = [v for v in values if values.count(v) == 1][0]  # 单张的值
        compare_value = (pair_value, pair_value, single_value)
        return '对子', 2, compare_value
    else:  # 单张
        return '单张', 1, compare_value



# 用于统计每个牌型等级的个数
hand_type_count = {
    '豹子': 0,
    '顺金': 0,
    '普金': 0,
    '普顺': 0,
    '对子': 0,
    '单张': 0
}




# 遍历所有组合并分类
results = []
for combo in combinations:
    hand_type, score, compare_value = classify_hand(combo)
    hand_type_count[hand_type] += 1
    result = [combo, hand_type, [score] + list(compare_value)]  # 将 score 和 compare_value 放在同一个列表里
    results.append(result)
    # results.append((combo, hand_type, score, compare_value))

# 对结果排序：先按评分从高到低，再按比较值从大到小
results.sort(key=lambda x: (x[2]), reverse=True)


i = 0
dengji = 741
jieguo = list()
for result in results:
    combo, hand_type, all_compare_value = result
    if i == 0:
        jieguo.append((combo, hand_type, all_compare_value, dengji))
        i = i + 1
    elif results[i][2] == results[i-1][2]:
        jieguo.append((combo, hand_type, all_compare_value, dengji))
        i = i +1
    else :
        dengji = dengji - 1
        jieguo.append((combo, hand_type, all_compare_value, dengji))
        i = i +1

# print(jieguo)


















# 将结果输出到文件
with open('jinhua.txt', 'w', encoding='UTF-8') as file:
    file.write("各牌型等级个数统计:\n")
    file.write(f"52张牌中任意抽三张，排列组合有52*51*50/(3*2*1)={len(combinations)}种\n")
    for hand_type, count in hand_type_count.items():
        file.write(f"{hand_type}: {count}\n")
    file.write("\n详细结果:\n")
    for hand, hand_type, all_compare_value,dengji in jieguo:
        cards_str = ', '.join([f"{card['suit']}{card['number']}" for card in hand])
        compare_str = ', '.join(map(str, all_compare_value))  # 比较值可视化
        file.write(f"{cards_str} - {(hand_type)} - ({compare_str}) - {dengji}\n")
















# 统计dengji的个数
dengji_count = {}

# 遍历jieguo中的每个结果，统计dengji出现的次数
for _, _, _, dengji in jieguo:
    if dengji not in dengji_count:
        dengji_count[dengji] = 0
    dengji_count[dengji] += 1


# # 输出统计结果
# print("dengji的个数统计:")
# for dengji, count in sorted(dengji_count.items(), reverse=True):
#     print(f"等级 {dengji}: {count} 次")





# 提取dengji的等级和对应的次数
dengji_levels = list(dengji_count.keys())
counts = list(dengji_count.values())

# 创建柱状图
plt.bar(dengji_levels, counts, color='skyblue')

# 添加标题和标签
plt.title('dengji等级分布统计')
plt.xlabel('dengji等级')
plt.ylabel('出现次数')

# 显示图表
plt.show()







