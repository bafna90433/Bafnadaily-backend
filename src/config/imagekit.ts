import ImageKit from 'imagekit';

// Lazy singleton — initializes only when first used, after dotenv has loaded
let _instance: ImageKit | null = null;

const getImageKit = (): ImageKit => {
  if (!_instance) {
    _instance = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY as string,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT as string,
    });
  }
  return _instance;
};

export default getImageKit;
