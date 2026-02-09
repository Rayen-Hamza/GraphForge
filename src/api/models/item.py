from typing import Optional


class ItemModel:
    def __init__(self, id: int, name: str, description: Optional[str] = None):
        self.id = id
        self.name = name
        self.description = description
