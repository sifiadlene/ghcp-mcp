import { describe, it, expect, vi, beforeEach } from 'vitest';
import favoritesReducer, {
  fetchFavorites,
  addFavorite,
  removeFavorite,
} from '../favoritesSlice';

const initialState = { items: [], status: 'idle' };

const sampleBooks = [
  { id: '1', title: 'Book One', author: 'Author A' },
  { id: '2', title: 'Book Two', author: 'Author B' },
  { id: '3', title: 'Book Three', author: 'Author C' },
];

describe('favoritesSlice reducer', () => {
  describe('fetchFavorites', () => {
    it('should set status to loading when pending', () => {
      const state = favoritesReducer(initialState, fetchFavorites.pending('', 'token'));
      expect(state.status).toBe('loading');
    });

    it('should populate items and set status to succeeded when fulfilled', () => {
      const state = favoritesReducer(
        initialState,
        fetchFavorites.fulfilled(sampleBooks, '', 'token'),
      );
      expect(state.status).toBe('succeeded');
      expect(state.items).toEqual(sampleBooks);
    });

    it('should set status to failed when rejected', () => {
      const state = favoritesReducer(initialState, fetchFavorites.rejected(null, '', 'token'));
      expect(state.status).toBe('failed');
    });

    it('should replace existing items on subsequent fetch', () => {
      const stateWithBooks = { items: sampleBooks, status: 'succeeded' };
      const newBooks = [{ id: '10', title: 'New Book', author: 'New Author' }];
      const state = favoritesReducer(
        stateWithBooks,
        fetchFavorites.fulfilled(newBooks, '', 'token'),
      );
      expect(state.items).toEqual(newBooks);
    });
  });

  describe('addFavorite', () => {
    it('should not modify items when fulfilled (relies on refetch)', () => {
      const stateWithBooks = { items: sampleBooks, status: 'succeeded' };
      const state = favoritesReducer(
        stateWithBooks,
        addFavorite.fulfilled('4', '', { token: 'token', bookId: '4' }),
      );
      expect(state.items).toEqual(sampleBooks);
    });
  });

  describe('removeFavorite', () => {
    it('should remove the book with the given id when fulfilled', () => {
      const stateWithBooks = { items: sampleBooks, status: 'succeeded' };
      const state = favoritesReducer(
        stateWithBooks,
        removeFavorite.fulfilled('2', '', { token: 'token', bookId: '2' }),
      );
      expect(state.items).toHaveLength(2);
      expect(state.items.find(b => b.id === '2')).toBeUndefined();
    });

    it('should leave other items intact after removal', () => {
      const stateWithBooks = { items: sampleBooks, status: 'succeeded' };
      const state = favoritesReducer(
        stateWithBooks,
        removeFavorite.fulfilled('1', '', { token: 'token', bookId: '1' }),
      );
      expect(state.items).toContainEqual({ id: '2', title: 'Book Two', author: 'Author B' });
      expect(state.items).toContainEqual({ id: '3', title: 'Book Three', author: 'Author C' });
    });

    it('should not change items when the bookId does not exist', () => {
      const stateWithBooks = { items: sampleBooks, status: 'succeeded' };
      const state = favoritesReducer(
        stateWithBooks,
        removeFavorite.fulfilled('nonexistent', '', { token: 'token', bookId: 'nonexistent' }),
      );
      expect(state.items).toHaveLength(3);
    });

    it('should handle removing the only item', () => {
      const stateWithOneBook = { items: [sampleBooks[0]], status: 'succeeded' };
      const state = favoritesReducer(
        stateWithOneBook,
        removeFavorite.fulfilled('1', '', { token: 'token', bookId: '1' }),
      );
      expect(state.items).toHaveLength(0);
    });

    it('should set status to failed when rejected', () => {
      const stateWithBooks = { items: sampleBooks, status: 'succeeded' };
      const state = favoritesReducer(
        stateWithBooks,
        removeFavorite.rejected(new Error('Failed'), '', { token: 'token', bookId: '1' }),
      );
      expect(state.status).toBe('failed');
      expect(state.items).toEqual(sampleBooks);
    });
  });
});

describe('favoritesSlice async thunks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchFavorites', () => {
    it('should fetch and return favorites from the API', async () => {
      const books = [{ id: '1', title: 'Book One', author: 'Author A' }];
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(books),
      }));
      const dispatch = vi.fn();
      const thunk = fetchFavorites('my-token');
      await thunk(dispatch, () => ({}), undefined);
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/favorites', {
        headers: { Authorization: 'Bearer my-token' },
      });
      const [, fulfillAction] = dispatch.mock.calls;
      expect(fulfillAction[0].payload).toEqual(books);
    });
  });

  describe('addFavorite', () => {
    it('should POST to the API and return the bookId', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
      const dispatch = vi.fn();
      const thunk = addFavorite({ token: 'my-token', bookId: '5' });
      await thunk(dispatch, () => ({}), undefined);
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer my-token' },
        body: JSON.stringify({ bookId: '5' }),
      });
      const [, fulfillAction] = dispatch.mock.calls;
      expect(fulfillAction[0].payload).toBe('5');
    });
  });

  describe('removeFavorite', () => {
    it('should DELETE to the API and return the bookId on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
      const dispatch = vi.fn();
      const thunk = removeFavorite({ token: 'my-token', bookId: '3' });
      await thunk(dispatch, () => ({}), undefined);
      expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/favorites/3', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer my-token' },
      });
      const [, fulfillAction] = dispatch.mock.calls;
      expect(fulfillAction[0].payload).toBe('3');
    });

    it('should dispatch rejected when the API returns a non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'User not found' }),
      }));
      const dispatch = vi.fn();
      const thunk = removeFavorite({ token: 'my-token', bookId: '99' });
      await thunk(dispatch, () => ({}), undefined);
      const [, rejectAction] = dispatch.mock.calls;
      expect(rejectAction[0].type).toBe('favorites/removeFavorite/rejected');
      expect(rejectAction[0].error.message).toBe('User not found');
    });

    it('should use fallback error message when response body is not parseable', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockRejectedValue(new Error('parse error')),
      }));
      const dispatch = vi.fn();
      const thunk = removeFavorite({ token: 'my-token', bookId: '99' });
      await thunk(dispatch, () => ({}), undefined);
      const [, rejectAction] = dispatch.mock.calls;
      expect(rejectAction[0].type).toBe('favorites/removeFavorite/rejected');
      expect(rejectAction[0].error.message).toBe('Failed to remove favorite');
    });
  });
});
