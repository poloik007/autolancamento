export interface OFXTransaction {
  fitId: string
  type: 'DEBIT' | 'CREDIT'
  dtPosted: string  // YYYYMMDDHHMMSS
  amount: number    // always positive — sign is derived from type
  memo: string
}

export interface OFXMeta {
  dtStart: string   // YYYYMMDD
  dtEnd: string     // YYYYMMDD
  bankId?: string
  accountId?: string
}

export function generateOFX(transactions: OFXTransaction[], meta: OFXMeta): string {
  const dtServer = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

  const txns = transactions.map((t) => {
    const amt = t.type === 'DEBIT' ? -Math.abs(t.amount) : Math.abs(t.amount)
    return [
      '<STMTTRN>',
      `<TRNTYPE>${t.type}`,
      `<DTPOSTED>${t.dtPosted}`,
      `<TRNAMT>${amt.toFixed(2)}`,
      `<FITID>${t.fitId}`,
      `<MEMO>${t.memo.slice(0, 32).replace(/[<>&]/g, ' ')}`,
      '</STMTTRN>',
    ].join('\n')
  }).join('\n')

  return [
    'OFXHEADER:100',
    'DATA:OFXSGML',
    'VERSION:151',
    'SECURITY:NONE',
    'ENCODING:UTF-8',
    'CHARSET:1252',
    'COMPRESSION:NONE',
    'OLDFILEUID:NONE',
    'NEWFILEUID:NONE',
    '',
    '<OFX>',
    '<SIGNONMSGSRSV1><SONRS>',
    '<STATUS><CODE>0\n<SEVERITY>INFO\n</STATUS>',
    `<DTSERVER>${dtServer}[-3:BRT]`,
    '<LANGUAGE>POR',
    '</SONRS></SIGNONMSGSRSV1>',
    '<BANKMSGSRSV1><STMTTRNRS>',
    '<TRNUID>1001',
    '<STATUS><CODE>0\n<SEVERITY>INFO\n</STATUS>',
    '<STMTRS>',
    '<CURDEF>BRL',
    '<BANKACCTFROM>',
    `<BANKID>${meta.bankId ?? '000'}`,
    `<ACCTID>${meta.accountId ?? '0'}`,
    '<ACCTTYPE>CHECKING',
    '</BANKACCTFROM>',
    '<BANKTRANLIST>',
    `<DTSTART>${meta.dtStart}`,
    `<DTEND>${meta.dtEnd}`,
    txns,
    '</BANKTRANLIST>',
    '</STMTRS>',
    '</STMTTRNRS></BANKMSGSRSV1>',
    '</OFX>',
  ].join('\n')
}
