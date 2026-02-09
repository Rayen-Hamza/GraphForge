from typing import List, Optional
from ...repositories.item_repo import ItemRepository
from ...schemas.item import ItemCreate, Item


class ItemService:
    def __init__(self):
        self.repo = ItemRepository()

    def create(self, item_create: ItemCreate) -> Item:
        model = self.repo.create(item_create.dict())
        return Item(**model)

    def list_all(self) -> List[Item]:
        return [Item(**m) for m in self.repo.list_all()]

    def get(self, item_id: int) -> Optional[Item]:
        data = self.repo.get(item_id)
        return Item(**data) if data else None
