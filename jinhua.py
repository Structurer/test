import itertools
import matplotlib.pyplot as plt
from matplotlib import rcParams

# 设置字体支持中文
rcParams['font.family'] = 'SimHei'

# 扑克牌相关常量
numbers = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
number_values = {n: v for v, n in enumerate(numbers, start=2)}
suits = ['♠', '♥', '♣', '♦']

# 生成扑克牌列表
cards = [{'number': n, 'value': number_values[n], 'suit': s} for n in numbers for s in suits]

def classify_hand(hand):
    """分类三张牌型并评分"""
    values = sorted([card['value'] for card in hand], reverse=True)
    suits = [card['suit'] for card in hand]
    unique_values, unique_suits = len(set(values)), len(set(suits))
    compare_value = tuple(values)

    if unique_values == 1:
        return '豹子', 6, compare_value
    elif unique_suits == 1:
        if (values[0] - values[2] == 2 and unique_values == 3) or (values == [14, 3, 2]):
            return '顺金', 5, compare_value
        return '普金', 4, compare_value
    elif (values[0] - values[2] == 2 and unique_values == 3) or (values == [14, 3, 2]):
        return '普顺', 3, compare_value
    elif unique_values == 2:
        pair_value = max(values, key=values.count)
        single_value = min(values, key=values.count)
        compare_value = (pair_value, pair_value, single_value)
        return '对子', 2, compare_value
    else:
        return '单张', 1, compare_value

def analyze_combinations(cards):
    """生成所有组合并分类、分级"""
    combinations = list(itertools.combinations(cards, 3))
    hand_type_count = {'豹子': 0, '顺金': 0, '普金': 0, '普顺': 0, '对子': 0, '单张': 0}
    results, unique_ranks = [], set()

    for combo in combinations:
        hand_type, score, compare_value = classify_hand(combo)
        hand_type_count[hand_type] += 1
        results.append([combo, hand_type, [score] + list(compare_value)])

    results.sort(key=lambda x: (x[2]), reverse=True)

    rank, ranked_results = len(set(tuple(r[2]) for r in results)), []
    for i, result in enumerate(results):
        combo, hand_type, all_compare_value = result
        if i > 0 and results[i][2] != results[i - 1][2]:
            rank -= 1
        ranked_results.append((combo, hand_type, all_compare_value, rank))
    return hand_type_count, ranked_results

def plot_rank_distribution(ranked_results):
    """绘制等级分布的柱状图"""
    dengji_count = {}
    for _, _, _, dengji in ranked_results:
        dengji_count[dengji] = dengji_count.get(dengji, 0) + 1

    dengji_levels, counts = list(dengji_count.keys()), list(dengji_count.values())

    # 获取所有分数并分配颜色
    unique_scores = sorted(set(r[2][0] for r in ranked_results))
    color_map = plt.cm.get_cmap("tab10", len(unique_scores))
    score_to_color = {score: color_map(i) for i, score in enumerate(unique_scores)}

    # 分配颜色
    dengji_to_score = {d: next(r[2][0] for r in ranked_results if r[3] == d) for d in dengji_levels}
    dengji_colors = [score_to_color[dengji_to_score[d]] for d in dengji_levels]

    # 绘制柱状图
    plt.bar(dengji_levels, counts, color=dengji_colors, width=1, align='edge')
    plt.xlim(min(dengji_levels), max(dengji_levels) + 1)
    plt.title('dengji等级分布统计')
    plt.xlabel('dengji等级')
    plt.ylabel('出现次数')

    # 显示图表
    plt.show()

# 分析扑克牌组合
hand_type_count, ranked_results = analyze_combinations(cards)

# 绘制等级分布图
plot_rank_distribution(ranked_results)
