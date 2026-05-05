import express, { RequestHandler, ErrorRequestHandler } from 'express';
import cookieSession from 'cookie-session';
import cors from 'cors';
import { errorHandler, NotFoundError, correlationId, currentUser } from '@teleshop/common';

const app = express();

app.set('trust proxy', true);

app.use(
  cors({
    origin: true, 
    credentials: true, 
  })
);

app.use(express.json());

app.use(correlationId as unknown as RequestHandler);

app.get('/health', (_req, res) => {
  res.status(200).send({ status: 'ok', service: 'catalog-service' });
});

app.use(
  cookieSession({
    signed: false,
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  })
);

app.use(currentUser as unknown as RequestHandler);

app.all(/.*/, () => {
  throw new NotFoundError();
});

app.use(errorHandler as unknown as ErrorRequestHandler);

export { app };