import { RowDataPacket } from 'mysql2/promise';
import pool from './conn';
type Primitive = string | number | boolean | undefined | null;
interface QueryResult<T> {
  rows: T[];
}
// 결과 매핑 함수
function mapFieldsToType<T extends object>(row: RowDataPacket, keys: (keyof T)[], exampleType: T): T {
  const mappedRow: Partial<T> = {};
  keys.forEach((key) => {
    const value = row[key as string];
    const expectedType = typeof exampleType[key];
    // 타입에 따라 값 변환
    if (expectedType === 'number') {
      (mappedRow as any)[key] = value !== null && value !== undefined ? Number(value) : 0;
    } else if (expectedType === 'string') {
      (mappedRow as any)[key] = value !== null && value !== undefined ? String(value) : '';
    } else {
      (mappedRow as any)[key] = value;
    }
    // 예약어 key를 변환
    // COUNT(...) -> count
    let strKey = key as string;
    const countRegex = /^COUNT\(.+\)$/i;
    if (countRegex.test(strKey)) {
      (mappedRow as any)['count'] = value;
      delete (mappedRow as any)[key];
    }
  });
  return mappedRow as T;
}
// sql 함수 정의
export const sql = async <T extends object = any>(
  strings: TemplateStringsArray,
  ...values: Primitive[]
): Promise<QueryResult<T>> => {
  const query = strings.reduce((prev, curr, i) => prev + curr + (values[i] || ''), '');
  const [rows] = await pool.query<RowDataPacket[]>(query);
  // 쿼리 결과의 첫 번째 항목이 객체인 경우, 필드 키 추출 및 매핑
  if (rows.length > 0 && typeof rows[0] === 'object') {
    const exampleType = {} as T;
    const keys = Object.keys(rows[0]) as (keyof T)[];
    const mappedRows = rows.map((row) => mapFieldsToType(row, keys, exampleType));
    return { rows: mappedRows };
  }
  // 제네릭 타입이 없거나 매핑할 필요가 없는 경우
  return { rows: rows as T[] };
};