function get_primes_under(n) {
  let primes = [2];
  for (let num = 3; num < n; num += 2) {
    for (const div of primes) {
      if (div * div > num) {
        primes.push(num);
        break;
      }
      if (num % div === 0) break; 
    }
  }
  return primes;
}

let primes = get_primes_under(1000000).length;
console.log(primes)