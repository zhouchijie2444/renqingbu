/**
 * 从百度OCR识别结果中提取多条记录
 * 典型人情簿格式：每行一个人，包含姓名和金额
 */
export function parseOcrText(wordsResult) {
  const wordsResultArr = wordsResult.words_result || []
  const allWords = wordsResultArr.map((w) => w.words)
  const fullText = allWords.join('\n')

  // 尝试按行拆分，每行可能是一个人的记录
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

  // 逐行解析：找 姓名 + 金额 的组合
  const records = []
  for (const line of lines) {
    const clean = line.replace(/[，,。、\s]+/g, ' ').trim()
    if (!clean) continue

    // 找金额（数字）
    const amountMatch = clean.match(/(\d{2,5})(?:元|块)?/)
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : null

    // 找姓名（金额前的2-3字中文，或第一个2-3字中文）
    let name = ''
    if (amountMatch && amountMatch.index > 0) {
      const before = clean.substring(0, amountMatch.index).trim()
      const nameMatch = before.match(/[一-鿿]{2,3}$/)
      if (nameMatch) name = nameMatch[0]
      else {
        const firstMatch = before.match(/[一-鿿]{2,3}/)
        if (firstMatch) name = firstMatch[0]
      }
    } else {
      const firstMatch = clean.match(/[一-鿿]{2,3}/)
      if (firstMatch) name = firstMatch[0]
    }

    if (name && amount) {
      records.push({
        person_name: name,
        amount: amount,
        event_type: eventType,
        record_date: recordDate,
      })
    }
  }

  // 如果没解析出多条，尝试整体解析一条
  if (records.length === 0 && lines.length > 0) {
    const name = allWords.length > 0 ? (allWords[0].match(/[一-鿿]{2,3}/) || [''])[0] : ''
    const amountMatch = fullText.match(/[一-鿿]+\s*(\d{2,5})/)
    const amountMatch2 = fullText.match(/(\d{2,5})(?:元|块)?/)
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : (amountMatch2 ? parseInt(amountMatch2[1], 10) : '')
    if (name || amount) {
      records.push({
        person_name: name,
        amount: amount,
        event_type: eventType,
        record_date: recordDate,
      })
    }
  }

  return {
    records,
    rawText: fullText,
    recognized: {
      event_type: eventType,
      record_date: recordDate,
    },
  }
}
