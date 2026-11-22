// Question IDs and seeds are also used by saved practice sessions.
const FocusQuestions = (() => {
  const applicationLabels = {
    t01: '根号端点的取值算错', t02: '代入负数后平方的符号算错', t03: '约分后忘记排除原分母的零点',
    t04: '没有按从内到外的顺序处理复合函数', t05: '把反函数值当作倒数', t06: '对数和指数的对应关系弄反',
    t07: '角度归回一个周期时出错', t08: '反三角函数的结果超出主值区间', t09: '把点值当作极限',
    t10: '从错误的一侧取表达式', t11: '代入极限时分子或分母算错', t12: '遇到 0/0 后没有化简',
    t13: '以为严格不等式取极限后仍然严格', t14: '没有用上下界控制振荡项', t15: '去绝对值时符号弄反',
    t16: '把负无穷端的 √(x²) 当作 x', t17: '数列分式的主导项比较错', t18: '无穷极限的正负号判断错',
    t19: '水平渐近线的高度算错', t20: '标准三角极限的比例因子丢了', t21: '没有识别有界量乘趋零量',
    t22: '余弦差的阶数判断错', t23: '指数和对数复合后代入出错', t24: '连续复利中的时间或利率用错',
    t25: '换元后没有处理分母上的常数', t26: '补的点值与极限不一致', t27: '左右极限的差算错',
    t28: '没有按定义域内的一侧取极限', t29: '零点定理中的端点函数值算错', t30: '差商还没化简就代入零增量',
    t31: '差商的分母没有与增量配平', t32: '分段点只检查了一侧斜率', t33: '乘积求导漏掉一项',
    t34: '余弦求导后的负号丢了', t35: '先代入点值再求导', t36: '二阶导数只求了一次',
    t37: '把函数值当作切线斜率', t38: '没有计算纵向变化与横向变化的比值', t39: '没有用可导性判断点的极限',
    t40: '反函数求导时用错原像', t41: '对数求导时分母写错', t42: '反三角函数求导漏乘内层导数',
    t43: '含 y 的项求导时丢了 y′', t44: '对数求导后忘记乘回原函数', t45: '把瞬时数据过早代入关系式',
    t46: '实数幂求导时系数算错',
    systems: '消元后没有检查右端是否矛盾', rowops: '整行运算中漏乘了倍数', rref: '从阶梯形矩阵认错主元列',
    free: '自由变量个数按零行数计算', span: '求线性组合时没有核对所有分量', axb: '算 Ax 时行列对应错误',
    homogeneous: '两个特解相减时分量符号算错', param: '参数的方向向量取错', independent: '线性相关关系中的系数取错',
    linear: '线性组合的系数没有带到输出', standard: '把标准基的像放成了行', onto: '把单射与满射的主元条件弄反',
    multiply: '矩阵乘积的列对应错', transpose: '矩阵幂的周期判断错', inverse: '用逆矩阵求解时向量分量算错',
    elementary: '逆行变换中的倍数符号写反', imt: '混淆方阵可逆与非齐次方程的解数',
    subspace: '检验加法封闭时没有检查和向量', col: '找到了主元列号却从化简后的矩阵取向量',
    null: '提取零空间方向向量时符号写反', dimension: '用行数减秩来算零空间维数'
  };

  function numeric(prompt, expected, explain, label = '你的答案') {
    return {prompt, label, expected: Array.isArray(expected) ? expected : [expected], explain};
  }

  function inner(seed) {
    const k = 3 + seed % 11;
    switch (seed % 3) {
      case 0:
        return numeric(`f(x) = (${k}x + 1)²，求 f′(1)。`, 2 * k * (k + 1),
          `先对平方求导，再乘内层斜率 ${k}。f′(x) = 2(${k}x + 1)·${k}，代入 1 得 ${2*k*(k+1)}。`);
      case 1:
        return numeric(`f(x) = sin(${k}x)，求 f′(0)。角度用弧度。`, k,
          `外层导数是 cos(${k}x)，内层导数是 ${k}。在 0 处相乘得到 ${k}·cos(0) = ${k}。`);
      default:
        return numeric(`f(x) = e^(${k}x)，求 f′(0)。`, k,
          `导数是 e^(${k}x)·${k}。在 0 处指数因子为 1，故 f′(0) = ${k}。`);
    }
  }

  function outer(seed) {
    const a = 2 + seed % 7, b = a + 3;
    return numeric(`已知 g(1) = ${b}，g′(1) = ${a}，h(u) = u${seed % 2 ? '³' : '²'}。若 F(x) = h(g(x))，求 F′(1)。`,
      (seed % 2 ? 3*b*b : 2*b)*a,
      `F′(1) = h′(g(1))g′(1)。把 ${b} 代入 h′，再乘 ${a}，得到 ${(seed % 2 ? 3*b*b : 2*b)*a}。`);
  }

  function rightHandSide(seed) {
    const k = 2 + seed % 6, a = 3 + seed % 5, b = 1 + seed % 4;
    const add = seed % 2 === 0, result = add ? b + k*a : b - k*a;
    const sign = add ? '+' : '−';
    return numeric(`增广矩阵的两行分别为 [1, −2 | ${a}] 与 [${add ? -k : k}, 3 | ${b}]。施行 R₂ ← R₂ ${sign} ${k}R₁ 后，新第二行的右端项是多少？`,
      result, `竖线右侧也要做同一行运算，新的右端项为 ${b} ${sign} ${k} × ${a} = ${result}。`);
  }

  function pivotColumns(seed) {
    const a = 2 + seed % 9, b = a + 2;
    const first = seed % 2 === 0;
    const matrix = first ? `[ ${a}  ${2*a}  0 ]\n[ 1  2  ${b} ]` : `[ 0  ${a}  1 ]\n[ 0  1  0 ]`;
    return numeric(`矩阵 A 为\n${matrix}\n按主元列顺序，从 A 中取出一组 Col A 的基。`,
      first ? [a,1,0,b] : [a,1,1,0],
      first ? `第二列是第一列的 2 倍，第三列独立。取原矩阵第 1、3 列，得到 (${a},1) 与 (0,${b})。`
            : `第一列为零，第 2、3 列独立。原矩阵中的这两列分别为 (${a},1) 与 (1,0)。`,
      '按列依次输入两个向量的四个分量');
  }

  function rankNullity(seed) {
    const rank = 1 + seed % 4, rows = rank + 1, columns = rows + 1 + seed % 3;
    return numeric(`矩阵 A 有 ${rows} 行、${columns} 列，秩为 ${rank}。分别求列空间和零空间的维数。`,
      [rank, columns-rank], `列空间维数等于秩 ${rank}。零空间维数等于列数减秩，即 ${columns} − ${rank} = ${columns-rank}。`,
      '依次输入 dim Col A、dim Nul A');
  }

  function product(seed) {
    const k = 2 + seed % 8;
    if (seed % 2) {
      return numeric(`f(x) = (x + ${k})eˣ，求 f′(0)。`, 1+k,
        `积的导数为 eˣ + (x + ${k})eˣ，两项在 0 处相加得到 1 + ${k} = ${1+k}。`);
    }
    return numeric(`f(x) = (x + ${k})(2x + 1)，求 f′(0)。`, 1+2*k,
      `两因子分别求导得到 f′(x) = (2x + 1) + 2(x + ${k})。所以 f′(0) = ${1+2*k}。`);
  }

  function angularScale(seed) {
    const k = 3 + seed % 9, b = k + 1 + seed % 3;
    return numeric(`求 lim(x→0) sin(${k}x) / ${seed % 2 ? 'sin('+b+'x)' : '('+b+'x)'}。角度用弧度。`,
      k/b, `把每个正弦与它的角配成 sin(u)/u。标准极限为 1，余下的比例因子为 ${k}/${b}。`);
  }

  function implicit(seed) {
    const a = 2 + seed % 5, b = a + 1;
    if (seed % 2) return numeric(`在曲线 xy + y² = ${a*b+b*b} 上，求点 (${a},${b}) 处的 dy/dx。`,
      -b/(a+2*b), `按 x 求导得 y + xy′ + 2yy′ = 0。因此 y′ = −y/(x + 2y)，在给定点等于 −${b}/${a+2*b}。`);
    return numeric(`在曲线 x² + y² = ${a*a+b*b} 上，求点 (${a},${b}) 处的 dy/dx。`,
      -a/b, `等式两侧对 x 求导得 2x + 2yy′ = 0。代入点坐标得到 y′ = −${a}/${b}。`);
  }

  const special = {
    t35: {inner: ['漏乘内层导数', inner], outer: ['外层导数代错位置', outer]},
    rowops: {rhs: ['行变换时漏改增广列', rightHandSide]},
    t33: {product: ['乘积求导漏掉一项', product]},
    t20: {scale: ['没有补回角度的比例因子', angularScale]},
    t43: {implicit: ['对 y 求导时漏写 y′', implicit]},
    col: {original: ['用化简后的列作为原列空间的基', pivotColumns]},
    dimension: {nullity: ['用行数减秩来算零空间维数', rankNullity]}
  };

  function options(topic) {
    if (!TOPICS.some(t => t.id === topic)) return [];
    const list = Object.entries(special[topic] || {}).map(([key, item]) => ({id: topic+'.'+key, label: item[0]}));
    if (!list.length || topic === 'rowops' || topic === 't35') {
      list.push({id: topic+'.apply', label: applicationLabels[topic]});
    }
    list.push({id: topic+'.method', label: '没选对这类题的解题步骤'});
    list.push({id: topic+'.read', label: '读错英文题目要求'});
    list.push({id: topic+'.concept', label: '没弄清概念或适用条件'});
    return list;
  }

  function topic(id) {
    if (typeof id !== 'string') return null;
    const key = id.split('.')[0];
    return options(key).some(item => item.id === id) ? key : null;
  }

  function label(id) {
    return options(topic(id)).find(item => item.id === id)?.label || '';
  }

  function choice(prompt, answers, explain, seed) {
    const offset = seed % answers.length;
    return {prompt, label: '选择答案', expected: answers[0], explain,
      options: [...answers.slice(offset), ...answers.slice(0, offset)]};
  }

  // Where the teaching prompt names a procedure, pose a fresh application of it.
  function mixedApplication(key, seed) {
    const a = 2 + seed % 7, b = a + 1;
    switch (key) {
      case 't29': {
        const c = a*a + 1;
        return choice(`f(x) = x² − ${c}。下面哪一个区间内一定有零点？`,
          [`[${a}, ${b}]`, `[0, ${a}]`, `[${b}, ${b+1}]`],
          `f(${a}) = −1，f(${b}) = ${2*a}。多项式连续，两端异号，所以区间 [${a}, ${b}] 内至少有一个零点。`, seed);
      }
      case 't30':
        if (seed % 2) return numeric(`求 lim(h→0) [1/(${a} + h) − 1/${a}]/h。`, -1/(a*a),
          `通分得到 −h/[${a}(${a} + h)]。在 h≠0 时约去 h，再取极限，得到 −1/${a*a}。`);
        return numeric(`求 lim(h→0) [(${a} + h)² − ${a*a}]/h。`, 2*a,
          `展开分子得到 ${2*a}h + h²。除以 h 后取极限，结果为 ${2*a}。`);
      case 't46': {
        const n = 3 + 2*(seed % 4), x = seed % 2 ? 9 : 4;
        return numeric(`f(x) = x^(${n}/2)，求 f′(${x})。`, (n/2)*x**(n/2-1),
          `x > 0 时 f′(x) = (${n}/2)x^(${n-2}/2)。代入 ${x}，得到 ${(n/2)*x**(n/2-1)}。`);
      }
      case 'rref':
        if (seed % 2) return numeric(`矩阵 A 的两行为 [0, ${a}, 1] 与 [0, ${b}, 0]。哪些列是主元列？`,
          [2,3], '第一列是零列，第二、三列相互独立。主元列为第 2、3 列。', '按递增顺序输入列号');
        return numeric(`矩阵 A 的两行为 [${a}, ${2*a}, 0] 与 [${b}, ${2*b}, 1]。哪些列是主元列？`,
          [1,3], '第二列是第一列的两倍，第三列不在第一列的张成空间内。主元列为第 1、3 列。', '按递增顺序输入列号');
      case 'col': {
        const matrix = `[ 1  ${a}  0 ]\n[ 0  0  1 ]\n[ ${b}  ${a*b}  1 ]`;
        return choice(`A =\n${matrix}\n哪组向量是 Col A 的一组基？`,
          [`(1,0,${b}) 与 (0,1,1)`, '(1,0,0) 与 (0,1,0)', `(1,0,${b}) 与 (${a},0,${a*b})`],
          `第二列是第一列的 ${a} 倍。第一、三列相互独立并张成整个列空间。`, seed);
      }
      case 'inverse':
        return numeric(`A = [[1,${a}],[1,${b}]]。求满足 Ax = (${a},${b+1}) 的 x。`, [-a,2],
          `第二个方程减去第一个得 x₂ = 2，代回第一个方程得 x₁ = −${a}。`, '依次输入 x₁、x₂');
      case 'subspace':
        if (seed % 2) return choice(`集合 H = {(x,y) ∈ ℝ² | xy = 0}。点 (${a},0)、(0,${b}) 均属于 H。H 是 ℝ² 的子空间吗？`,
          ['不是', '是'], `两点的和为 (${a},${b})，其坐标乘积非零，故 H 对加法不封闭。`, seed);
        return choice(`集合 H = {(x,y) ∈ ℝ² | y = ${a}x}。H 是 ℝ² 的子空间吗？`,
          ['是', '不是'], `H 是向量 (1,${a}) 的张成空间。`, seed);
      case 'dimension':
        return rankNullity(seed);
      default:
        return null;
    }
  }

  function readingPrompt(key, seed, original) {
    const a = 2 + seed % 8;
    switch (key) {
      case 't29': return `Let f(x) = x² − ${a}. Must f have a zero in [0, ${a}]?`;
      case 't30': return `If f(x) = x², find lim(h → 0) [f(${a} + h) − f(${a})]/h.`;
      case 't46': return `For x > 0, let f(x) = x^(${2*a+1}/2). Find f′(1).`;
      case 'col': return `A = [[1,${a},0],[0,0,1],[2,${2*a},1]]. Which of the original columns form a basis for Col A?`;
      case 'inverse': return `Find the inverse of A = [[1,${a}],[1,${a+1}]].`;
      case 'subspace': return `Does H = {(x,y) ∈ ℝ² | xy = 0} form a subspace? Consider (${a},0) and (0,1).`;
      case 'dimension': return `A has ${a} rows, ${a+2} columns and rank ${a-1}. Find the dimensions of Col A and Nul A.`;
      default: return original;
    }
  }

  function make(id, seed = 0, blind = false) {
    const key = topic(id);
    if (!key || !Number.isSafeInteger(seed) || seed < 0) throw new RangeError('无效的错因或题目编号');
    const kind = id.split('.')[1];
    const reading = kind === 'read' || kind === 'concept';
    if (blind && !reading) {
      const problem = mixedApplication(key, seed);
      if (problem) return problem;
    }
    if (special[key]?.[kind]) return special[key][kind][1](seed);
    const q = Engine.generate(key, 1000 + seed % 99000, 1);
    let field;
    if (reading) field = q.fields.find(f => f.dim === (kind === 'read' ? 0 : 1));
    else if (kind === 'method' && !blind) field = q.fields.find(f => f.dim === 2);
    else field = q.fields.filter(f => f.dim === 3).at(-1);
    const prompt = (blind && reading) || key === 'dimension' ? readingPrompt(key, seed, q.prompt) : q.prompt;
    return {
      prompt, label: field.label, expected: field.expected,
      options: field.options ? [...new Set(field.options)] : undefined,
      explain: field.explain
    };
  }

  return {options, topic, label, make};
})();
