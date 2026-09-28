from __future__ import annotations

from typing import Any, Dict, List, Optional, Protocol, runtime_checkable
from uuid import UUID


@runtime_checkable
class TransactionRepository(Protocol):
    def list_transactions(
        self,
        *,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        type: Optional[str] = None,
        category_id: Optional[UUID] = None,
        payment_method: Optional[str] = None,
    ) -> List[Dict[str, Any]]: ...

    def get_transaction(self, tx_id: UUID) -> Optional[Dict[str, Any]]: ...

    def create_transaction(self, payload: Dict[str, Any]) -> Dict[str, Any]: ...

    def update_transaction(
        self, tx_id: UUID, payload: Dict[str, Any]
    ) -> Dict[str, Any]: ...

    def delete_transaction(self, tx_id: UUID) -> None: ...

    def list_categories(self) -> List[Dict[str, Any]]: ...

    def get_category(self, cat_id: UUID) -> Optional[Dict[str, Any]]: ...
