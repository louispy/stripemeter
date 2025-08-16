"""
Stripemeter exceptions
"""

from typing import Optional, Any


class StripemeterError(Exception):
    """Base exception for Stripemeter SDK"""
    
    def __init__(
        self,
        message: str,
        status_code: int = 0,
        data: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.data = data
    
    def __str__(self):
        if self.status_code:
            return f"StripemeterError({self.status_code}): {self.message}"
        return f"StripemeterError: {self.message}"
