export interface Category {
  id_category: number;
  name: string;
}

export interface Post {
  id_post: number;
  title: string;
  description: string;
  image_url?: string | null;
  category: string;
  author: string;
  author_email?: string;
  author_phone?: string;
  author_avatar?: string;
  avg_rating?: number | string | null;
  total_reviews?: number;
}
