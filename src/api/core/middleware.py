"""Request middleware for error handling, request IDs, and logging."""

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)


class RequestMiddleware(BaseHTTPMiddleware):
    """Adds request ID tracking, timing, and structured error handling."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start = time.monotonic()

        try:
            response = await call_next(request)
            elapsed = time.monotonic() - start

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{elapsed:.3f}s"

            if elapsed > 5.0:
                logger.warning(
                    "[%s] %s %s — %dms (slow)",
                    request_id, request.method, request.url.path,
                    int(elapsed * 1000),
                )

            return response

        except Exception as exc:
            elapsed = time.monotonic() - start
            logger.exception(
                "[%s] %s %s — unhandled error after %dms",
                request_id, request.method, request.url.path,
                int(elapsed * 1000),
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "request_id": request_id,
                },
                headers={"X-Request-ID": request_id},
            )
