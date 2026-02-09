from fastapi import APIRouter, HTTPException
from ...schemas.item import ItemCreate, Item
from ...services.item_service import ItemService

router = APIRouter()
service = ItemService()


@router.post("/", response_model=Item)
def create_item(item: ItemCreate):
    return service.create(item)


@router.get("/", response_model=list[Item])
def list_items():
    return service.list_all()


@router.get("/{item_id}", response_model=Item)
def get_item(item_id: int):
    item = service.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
