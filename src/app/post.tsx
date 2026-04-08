import { router } from 'expo-router';
import { PostForm } from '../components/PostForm';

export default function PostScreen() {
  return (
    <PostForm onSuccess={() => router.back()} />
  );
}
