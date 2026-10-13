type Result<T> = {data: T[] | null; error: {message: string} | null};

// PostgREST has a server row limit; retrieve every page before showing totals.
export async function allRows<T>(read: (from: number, to: number) => PromiseLike<Result<T>>): Promise<Result<T>> {
  const rows: T[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const result = await read(from, from + pageSize - 1);
    if (result.error) return {data: null, error: result.error};
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < pageSize) return {data: rows, error: null};
  }
}
