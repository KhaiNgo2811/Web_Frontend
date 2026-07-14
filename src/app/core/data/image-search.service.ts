import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Post } from '../models';
import { toPost } from './http-mappers';
import { mapHttpError } from './http-repository.utils';

interface ImageSearchResponse {
  data: Record<string, unknown>[];
}

/**
 * Calls antgo-backend's POST /api/search/by-image: a locally-run CLIP model
 * embeds the uploaded photo and MongoDB Atlas Vector Search returns visually
 * similar posts (see antgo-backend/README.md §5). Kept as its own small
 * service rather than a PostRepository method — it's a one-off search
 * action, not part of the Post CRUD surface.
 */
@Injectable({ providedIn: 'root' })
export class ImageSearchService {
  private readonly http = inject(HttpClient);

  searchByImage(file: File): Observable<Post[]> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<ImageSearchResponse>(`${environment.apiBaseUrl}/search/by-image`, formData).pipe(
      map(({ data }) => data.map(toPost)),
      mapHttpError(),
    );
  }
}
