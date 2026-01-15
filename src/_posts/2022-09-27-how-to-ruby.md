---
title: "How to Ruby on Apple Silicon"
---

See https://gist.github.com/dentarg/79aae28811c290b7a6a96ab4fafd4197

```bash
git clone https://gist.github.com/79aae28811c290b7a6a96ab4fafd4197.git /tmp/arm_mac
mv /tmp/arm_mac/.zshenv ~/
mkdir ~/bin
mv /tmp/arm_mac/rbuild ~/bin
chmod u+x ~/bin/rbuild

cd $HOME
git clone --branch do-no-set-gem-home https://github.com/eregon/chruby.git

source ~/.zshenv

# install ruby for aarch64
brew install ruby-build
rbuild 3.1.2

# install ruby for x86_64
intel
brew install ruby-build
rbuild 3.1.2
```
