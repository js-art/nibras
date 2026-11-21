-- A circle note can sit on a point or a drawn range in the Emirates or Oman.
ALTER TABLE "CirclePost" ADD COLUMN "place" JSONB;
