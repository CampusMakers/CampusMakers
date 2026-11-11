export const USERNAME_TAKEN = 'That username is already taken. Please choose another.';

// This check provides friendly feedback; the database unique index is the
// authority, including when two requests claim the same name concurrently.
export async function withAvailableUsername(client, username, save) {
    const check = async () => {
        const { data, error } = await client.rpc('username_available', { candidate: username });
        if (error) throw error;
        if (!data) throw new Error(USERNAME_TAKEN);
    };
    await check();
    const result = await save();
    if (result.error) {
        // Auth may hide a database constraint error behind a generic message.
        // Recheck after a failed write to explain a concurrent username claim.
        try {
            await check();
        } catch (error) {
            if (error.message === USERNAME_TAKEN) throw error;
        }
        throw result.error;
    }
    return result;
}
