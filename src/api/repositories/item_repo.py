from typing import List, Optional


class ItemRepository:
    def __init__(self):
        self._items: List[dict] = []
        self._next = 1

    def create(self, data: dict) -> dict:
        obj = data.copy()
        obj["id"] = self._next
        self._next += 1
        self._items.append(obj)
        return obj

    def list_all(self) -> List[dict]:
        return self._items

    def get(self, item_id: int) -> Optional[dict]:
        for it in self._items:
            if it["id"] == item_id:
                return it
        return None
