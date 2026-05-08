import type { RawTransaction } from '../normalizer'
import { bradesco } from './bradesco'
import { itau } from './itau'
import { santander } from './santander'
import { bb } from './bb'
import { generic } from './generic'

export interface ParserStrategy {
  canHandle(text: string): boolean
  parse(text: string): RawTransaction[]
}

const strategies: ParserStrategy[] = [bradesco, itau, santander, bb, generic]

export function selectStrategy(text: string): ParserStrategy {
  return strategies.find((s) => s.canHandle(text)) ?? generic
}
