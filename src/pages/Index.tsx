
import TankGame from '@/components/TankGame';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6 text-black">Танковая Битва</h1>
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden p-2">
        <TankGame />
      </div>
    </div>
  );
};

export default Index;
