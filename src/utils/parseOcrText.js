/**
 * 从百度OCR识别结果中提取结构化信息
 */
export function parseOcrText(wordsResult) {
  const words = (wordsResult.words_result || []).map((w) => w.words)
  const fullText = words.join('\n')

  // 提取金额：找数字
  const amountMatch = fullText.match(/(\d{2,4})(?:元|块)?/)
  const amount = amountMatch ? parseInt(amountMatch[1], 10) : ''

  // 提取日期
  let dateStr = ''
  const datePatterns = [
    /(\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?)/,
    /(\d{4}\s*\d{1,2}\s*\d{1,2})/,
    /(\d{1,2}月\d{1,2}[日号])/,
  ]
  for (const pat of datePatterns) {
    const m = fullText.match(pat)
    if (m) { dateStr = m[1]; break }
  }

  // 提取姓名：第一行或第一个2-3字中文
  let name = ''
  if (words.length > 0) {
    const firstWord = words[0].trim()
    if (/^[一-鿿]{2,3}$/.test(firstWord)) {
      name = firstWord
    }
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

  return { person_name: name, amount, record_date: dateStr, event_type: eventType, rawText: fullText }
}
