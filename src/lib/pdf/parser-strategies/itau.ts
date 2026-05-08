import type { ParserStrategy } from './index'
import type { RawTransaction } from '../normalizer'
import { generic } from './generic'

const HEADER = /Banco\s+Ita[uú]|ita[uú]\s+unibanco/i

export const itau: ParserStrategy = {
  canHandle(text: string): boolean {
    return HEADER.test(text)
  },
  parse(text: string): RawTransaction[] {
    // Itaú layout is similar to generic — delegate and refine as needed
    return generic.parse(text)
  },
}
