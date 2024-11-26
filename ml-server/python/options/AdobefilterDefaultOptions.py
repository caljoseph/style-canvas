from .base_options import BaseOptions

class AdobefilterDefaultOptions(BaseOptions):
    def __init__(self, ai_model_name='VanGogh_OB', which_epoch='latest', ngf=64, n_local_enhancers=2, load_size=1024, fine_size=512):
        super().__init__()  # Initialize BaseOptions first

        # Override or extend BaseOptions defaults
        self.name = ai_model_name
        self.which_epoch = which_epoch
        self.ngf = ngf
        self.n_local_enhancers = n_local_enhancers
        self.loadSize = load_size
        self.fineSize = fine_size

        # Adobefilter-specific settings
        self.label_nc = 0
        self.no_instance = True
        self.dataroot = './datasets/'
        self.batchSize = 1

    def get_options(self):
        """Return the current options as a dictionary."""
        return self.__dict__.copy()
