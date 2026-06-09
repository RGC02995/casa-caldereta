export function withId<T extends { _id: unknown }>(doc: T): T {
    return Object.assign(doc, { id: String((doc as Record<string, unknown>)['_id']) });
}
