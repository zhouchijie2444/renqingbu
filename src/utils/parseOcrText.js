/**
 * 从百度OCR识别结果中提取多条记录
 */
export function parseOcrText(wordsResult) {
  const wordsResultArr = wordsResult.words_result || []
  const allWords = wordsResultArr.map((w) => w.words)
  const fullText = allWords.join('\n')

  const lines = fullText.split(/[\n\r]+/).filter((l) => l.trim())

  // 提取日期
  let recordDate = ''
  const datePatterns = [
    /(\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?)/,
    /(\d{4}\s+\d{1,2}\s+\d{1,2})/,
    /(\d{1,2}月\d{1,2}[日号])/,
  ]
  for (const pat of datePatterns) {
    const m = fullText.match(pat)
    if (m) { recordDate = m[1]; break }
  }

  // 提取事件类型
  let eventType = '其他'
  const eventKeywords = {
    '红事': ['结婚', '婚礼', '娶', '嫁', '喜事', '满月', '周岁'],
    '白事': ['白事', '丧', '去世', '追悼', '葬礼'],
    '生日': ['生日', '寿', '诞辰'],
    '升学': ['升学', '高考', '大学', '考取', '录取', '毕业'],
    '乔迁': ['乔迁', '搬家', '新居', '入宅'],
  }
  for (const [type, kws] of Object.entries(eventKeywords)) {
    if (kws.some((kw) => fullText.includes(kw))) {
      eventType = type
      break
    }
  }

  // 先过滤掉年份和日期数字，避免被当作金额
  function isYear(n) { return n >= 1900 && n <= 2100 }
  function isDateNum(n) { return n >= 1 && n <= 31 }

  // 逐行解析
  const records = []
  for (const line of lines) {
    const clean = line.replace(/[，,。、\s]+/g, ' ').trim()
    if (!clean) continue

    // 跳过纯标题行
    if (/^(红事|白事|人情|随礼|记录|日期|姓名|金额|序号|编号)/.test(clean)) continue

    // 找金额：后面带"元"或"块"的优先，然后是独立的3-4位数字（排除年份）
    const amounts = []
    // 带单位的金额
    const unitMatches = clean.matchAll(/(\d{2,4})\s*[元块]/g)
    for (const m of unitMatches) {
      const n = parseInt(m[1], 10)
      if (!isYear(n) && n >= 10 && n <= 9999) amounts.push({ val: n, idx: m.index })
    }
    // 独立的3-4位数字（但要排除年份）
    if (amounts.length === 0) {
      const numMatches = clean.matchAll(/(?<!\d)(\d{3,4})(?!\d)/g)
      for (const m of numMatches) {
        const n = parseInt(m[1], 10)
        if (!isYear(n) && !isDateNum(n) && n >= 50) amounts.push({ val: n, idx: m.index })
      }
    }

    // 找姓名：2-3字中文
    const nameMatches = [...clean.matchAll(/[一-鿿]{2,3}/g)]
      .filter((m) => !/^(红事|白事|生日|升学|乔迁|婚礼|丧事|喜事|满月|周岁|结婚|去世|搬家|新居|大学|高考|录取|毕业|人情|随礼|记录|日期|姓名|金额|序号|编号)/.test(m[0]))

    // 匹配最近的姓名-金额对
    if (amounts.length > 0 && nameMatches.length > 0) {
      for (const amt of amounts) {
        // 找金额前面最近的姓名
        let bestName = null
        for (const nm of nameMatches) {
          if (nm.index < amt.idx) {
            if (!bestName || nm.index > bestName.index) bestName = nm
          }
        }
        if (bestName) {
          records.push({ person_name: bestName[0], amount: amt.val, event_type: eventType, record_date: recordDate })
        }
      }
    } else if (nameMatches.length >= 1) {
      // 没有金额但有姓名，尝试整体提取
      const n = nameMatches[0][0]
      const am = clean.match(/(\d{2,4})\s*[元块]/)
      let amount = ''
      if (am) {
        const v = parseInt(am[1], 10)
        if (!isYear(v) && v >= 10) amount = v
      }
      if (amount) {
        records.push({ person_name: n, amount, event_type: eventType, record_date: recordDate })
      }
    }
  }

  // 去重（同一个人名+金额只保留一次）
  const seen = new Set()
  const unique = records.filter((r) => {
    const key = `${r.person_name}-${r.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    records: unique,
    rawText: fullText,
    recognized: { event_type: eventType, record_date: recordDate },
  }
}
