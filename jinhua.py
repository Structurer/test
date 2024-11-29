import itertools

# 定义扑克牌的点数、花色和对应的数值
numbers = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
number_values = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14}
suits = ['♠', '♥', '♣', '♦']

# 生成扑克牌列表，存储为键值对
cards = [{'number': number, 'value': number_values[number], 'suit': suit} for number in numbers for suit in suits]

# 生成所有3张牌的组合
combinations = list(itertools.combinations(cards, 3))

# print(len(combinations))

# 定义判断牌型的函数
def classify_hand(hand):
    """
    根据三张牌分类并评分
    """
    values = sorted([card['value'] for card in hand], reverse=True) # 按点数从大到小排序
    
    # print("排序后的点数:", values)
    
    
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
    results.append((combo, hand_type, score, compare_value))



# 对结果排序：先按评分从高到低，再按比较值从大到小
results.sort(key=lambda x: (x[2], x[3]), reverse=True)


# 将结果输出到文件
with open('output.txt', 'w', encoding='UTF-8') as file:
    file.write("各牌型等级个数统计:\n")
    file.write(f"52张牌中任意抽三张，排列组合有52*51*50/(3*2*1)={len(combinations)}种\n")
    for hand_type, count in hand_type_count.items():
        file.write(f"{hand_type}: {count}\n")
    file.write("\n详细结果:\n")
    for hand, hand_type, score, compare_value in results:
        cards_str = ', '.join([f"{card['suit']}{card['number']}" for card in hand])
        compare_str = ', '.join(map(str, compare_value))  # 比较值可视化
        file.write(f"{cards_str} - {(hand_type)} ({compare_str}): {score}\n")